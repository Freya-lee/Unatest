const fs = require('fs');
const axios = require('axios');
const ExcelJS = require('exceljs');
const crypto = require('crypto');

// 将订单状态代码映射到中文描述
const statusMapping = {
    'ACCEPT_SUCCESS': '接收成功',
    'APPLYING': '申请中',
    'APPLY_FAILURE': '申请准备失败',
    'VALIDATE_WAIT': '待验证',
    'VALIDATE_SUCCESS': '验证成功',
    'VALIDATE_FAILURE': '验证失败',
    'ISSUE_WAIT': '待签发',
    'ISSUE_SUCCESS': '签发成功',
    'ISSUE_FAILURE': '签发失败',
    'CANCELED': '取消申请',
    'REVOKED': '吊销',
    'DEPLOY_SUCCESS': '部署成功',
    'DEPLOY_FAILURE': '部署失败'
};

// 读取 CertificatesList.json 文件
function readCertificatesList(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading certificates list:', error.message);
        return [];
    }
}

// 查询证书申请订单详情
async function fetchOrderDetails(orderId) {
    const username = 'cdnetworks-ssea-demo'; // 替换为实际用户名
    const apiKey = 'ZLnDecHJ*6QUm,OG7SN4y1T>Wng'; // 替换为实际 API 密钥
    const date = new Date().toUTCString();

    // 计算密码
    const hmac = crypto.createHmac('sha1', apiKey);
    hmac.update(date);
    const password = hmac.digest('base64');

    try {
        const response = await axios.post('https://api.cdnetworks.com/api/certificate/order/detail', {
            orderId
        }, {
            headers: {
                'Date': date,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error(`Failed to fetch details for orderId ${orderId}:`, error.message);
        return { errorMessage: error.message };
    }
}

// 创建并写入 Excel 文件
async function createExcelFile(domains) {
    const workbook = new ExcelJS.Workbook();
    const detailsSheet = workbook.addWorksheet('Certificates');
    const summarySheet = workbook.addWorksheet('Summary');

    // 设置 Certificates 表的列头
    detailsSheet.columns = [
        { header: '域名', key: 'domain', width: 30 },
        { header: '订单状态（中文）', key: 'orderStatusCN', width: 30 },
        { header: '订单状态（原始）', key: 'orderStatus', width: 30 },
        { header: '证书ID', key: 'certificateId', width: 15 },
        { header: '错误信息', key: 'errorMessage', width: 30 }
    ];

    const certificateDetails = [];
    const statusCounts = {};

    for (const { domain, orderId } of domains) {
        const details = await fetchOrderDetails(orderId);
        const orderStatus = details.data ? details.data.orderStatus : null;
        const orderStatusCN = orderStatus ? statusMapping[orderStatus] : '未知状态';
        const certificateId = details.data ? details.data.certificateId : '';
        const errorMessage = details.errorMessage || '';

        // 增加状态计数
        if (orderStatus) {
            statusCounts[orderStatus] = (statusCounts[orderStatus] || 0) + 1;
        }

        // 收集数据
        certificateDetails.push({
            domain,
            orderStatusCN,
            orderStatus,
            certificateId,
            errorMessage
        });

        // 写入到 Excel
        detailsSheet.addRow({
            domain,
            orderStatusCN,
            orderStatus,
            certificateId,
            errorMessage
        });
    }

    // 在控制台输出收集的数据
    console.table(certificateDetails);

    // 设置 Summary 表的列头
    summarySheet.columns = [
        { header: '订单状态（原始）', key: 'orderStatus', width: 30 },
        { header: '订单状态（中文）', key: 'orderStatusCN', width: 30 },
        { header: '数量', key: 'count', width: 15 }
    ];

    const summaryDetails = [];

    // 填充 Summary 表的数据
    for (const [status, count] of Object.entries(statusCounts)) {
        summaryDetails.push({
            orderStatus: status,
            orderStatusCN: statusMapping[status],
            count
        });

        summarySheet.addRow({
            orderStatus: status,
            orderStatusCN: statusMapping[status],
            count
        });
    }

    // 在控制台输出汇总数据
    console.table(summaryDetails);

    await workbook.xlsx.writeFile('CertificatesDetails.xlsx');
    console.log('Excel file has been created successfully.');
}

async function checkCertStatus() {
    const certificates = readCertificatesList('CertificatesList.json');
    if (certificates.length === 0) {
        console.error('No certificates found in the list.');
        return;
    }
    await createExcelFile(certificates);
}

// 导出 readCertificatesList 和 checkCertStatus 函数
module.exports = { readCertificatesList, checkCertStatus };
