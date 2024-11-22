const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

// 读取 CertificatesList.json 文件
function readCertificatesList(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading CertificatesList.json:', error.message);
        return [];
    }
}

// 生成 Authorization 信息
function generateAuthHeader(username, apiKey) {
    const date = new Date().toUTCString();
    const hmac = crypto.createHmac('sha1', apiKey);
    hmac.update(date);
    const password = hmac.digest('base64');
    return { date, username, password };
}

// 取消证书申请订单
async function cancelOrder(orderId, auth) {
    try {
        const response = await axios.post('https://api.cdnetworks.com/api/certificate/order/cancel', {
            orderId
        }, {
            headers: {
                'X-Time-Zone': 'GMT+08:00',
                'Date': auth.date,
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
            }
        });

        const { code, message } = response.data;
        return { orderId, code: code === '0' ? '成功' : '失败', message };

    } catch (error) {
        const errorMsg = error.response && error.response.data ? error.response.data : error.message;
        return {
            orderId,
            code: '错误',
            message: errorMsg
        };
    }
}

// deleteApplyCert 函数
async function deleteApplyCert() {
    const certificates = readCertificatesList('CertificatesList.json');
    if (certificates.length === 0) {
        console.error('No valid certificates found to process.');
        return;
    }

    const username = 'cdnetworks-ssea-demo'; // 替换为您的实际用户名
    const apiKey = 'ZLnDecHJ*6QUm,OG7SN4y1T>Wng'; // 替换为实际 API 密钥
    const auth = generateAuthHeader(username, apiKey);

    const results = [];

    for (const { orderId } of certificates) {
        if (orderId) {
            const result = await cancelOrder(orderId, auth);
            results.push(result);
        } else {
            console.warn('Order ID is missing for a certificate entry.');
        }
    }

    // 使用 console.table 输出结果s
    console.table(results);
}

// 导出 deleteApplyCert 函数
module.exports = { deleteApplyCert };
