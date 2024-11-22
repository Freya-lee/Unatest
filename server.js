const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { applyCert } = require('./applyCert'); // 确保路径正确
const { checkCertStatus } = require('./checkCertStatus'); // 确保路径正确
const { deleteApplyCert } = require('./deleteApplyCert'); // 确保路径正确

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/save-domains', (req, res) => {
    const domains = req.body.domains;

    if (!domains) {
        return res.status(400).json({ success: false, message: 'No domains provided' });
    }

    fs.writeFile('domain-list.txt', domains, (err) => {
        if (err) {
            console.error('Failed to save domains:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

app.post('/apply-cert', async (req, res) => {
    try {
        const results = await applyCert();
        if (results.length === 0) {
            return res.status(500).json({ success: false, message: 'No valid certificates could be applied.' });
        }
        res.json({ success: true, orders: results });
    } catch (error) {
        console.error('Error applying certificates:', error);
        res.status(500).json({ success: false, message: 'Failed to apply certificates.', error: error.message });
    }
});

app.post('/check-cert-status', async (req, res) => {
    try {
        const certificates = readCertificatesList('CertificatesList.json');
        if (certificates.length === 0) {
            return res.status(404).json({ success: false, message: 'No certificates found.' });
        }

        const details = await Promise.all(certificates.map(cert => fetchOrderDetails(cert.orderId)));
        res.json({ success: true, details });
    } catch (error) {
        console.error('Error checking certificate status:', error);
        res.status(500).json({ success: false, message: 'Failed to check certificate status.', error: error.message });
    }
});

// 更新 delete-cert-order 路由以调用 deleteApplyCert 函数
app.post('/delete-cert-order', async (req, res) => {
    try {
        const results = await deleteApplyCert();
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error deleting certificates:', error);
        res.status(500).json({ success: false, message: 'Failed to delete certificates.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
