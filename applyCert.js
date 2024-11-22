const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

// 生成 Authorization 信息
function generateAuthHeader(username, apiKey) {
    const date = new Date().toUTCString();
    const hmac = crypto.createHmac('sha1', apiKey);
    hmac.update(date);
    const password = hmac.digest('base64');
    return { date, username, password };
}

// 读取域名列表
function readDomainList(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (error) {
        console.error('Error reading domain list:', error.message);
        return [];
    }
}

// 创建证书申请订单
async function createCertificateOrder(domain, auth) {
    try {
        const response = await axios.post('https://api.cdnetworks.com/api/certificate/order/create', {
            certificateName: domain,
            certificateSpec: "LetsEncryptDVFree",
            autoRenew: "false",
            certificateBrand: "LE",
            certificateType: "DV",
            algorithm: "RSA2048",
            autoValidate: "false",
            validateMethod: "HTTP",
            autoDeploy: "true",
            validityDays: 90,
            identificationInfo: {
                commonName: domain,
                subjectAlternativeNames: [domain]
            }
        }, {
            headers: {
                'X-Time-Zone': 'GMT+08:00',
                'Date': auth.date,
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
            }
        });

        const { code, message, data } = response.data;
        if (code === '0') {
            console.log(`Order created successfully for ${domain}: ${message}`);
            return { domain, orderId: data.orderId, status: 'Completed' };
        } else {
            console.log(`Failed to create order for ${domain}: ${message}`);
            return { domain, orderId: null, status: 'Failed' };
        }
    } catch (error) {
        console.error(`Error creating order for ${domain}:`, error.response ? error.response.data : error.message);
        return { domain, orderId: null, status: 'Error' };
    }
}

// applyCert 函数
async function applyCert() {
    const domainFilePath = 'domain-list.txt'; // 确保路径正确
    const domains = readDomainList(domainFilePath); // 读取域名列表
    if (domains.length === 0) {
        console.error('No valid domains found to process.');
        return [];
    }

    const username = 'cdnetworks-ssea-demo'; // 替换为您的实际用户名
    const apiKey = 'ZLnDecHJ*6QUm,OG7SN4y1T>Wng'; // 替换为实际 API 密钥
    const auth = generateAuthHeader(username, apiKey);

    const results = [];
    for (const domain of domains) {
        try {
            const result = await createCertificateOrder(domain, auth);
            results.push(result);
        } catch (error) {
            console.error(`Failed to create order for ${domain}:`, error.message);
            results.push({ domain, orderId: null, status: 'Error', message: error.message });
        }
    }

    console.table(results);
    fs.writeFileSync('CertificatesList.json', JSON.stringify(results, null, 2));
    console.log('Results have been saved to CertificatesList.json');

    return results;
}

module.exports = { applyCert };
