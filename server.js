const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as id ' + db.threadId);
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/master-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-form.html'));
});

app.get('/order-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order-form.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// API Routes
app.get('/api/catalogue', (req, res) => {
    const query = 'SELECT * FROM Catalogue WHERE is_active = TRUE ORDER BY Name';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

app.get('/api/delivery-staff', (req, res) => {
    const query = 'SELECT * FROM Delivery_Staff WHERE is_active = TRUE ORDER BY name';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

app.post('/api/catalogue', (req, res) => {
    const { name, description, price, is_vegetarian } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

    const query = 'INSERT INTO Catalogue (Name, Description, price, is_vegetarian) VALUES (?, ?, ?, ?)';
    db.query(query, [name, description, price, is_vegetarian || false], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json({ success: true, item_id: results.insertId });
    });
});

app.post('/api/customer', (req, res) => {
    const { first_name, last_name, email, phone } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'First and last name required' });

    const query = 'INSERT INTO Customer (first_name, last_name, Email, Phone) VALUES (?, ?, ?, ?)';
    db.query(query, [first_name, last_name, email, phone], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json({ success: true, customer_id: results.insertId });
    });
});

app.post('/api/customer-address', (req, res) => {
    const { customer_id, street_address, city, state, zip_code } = req.body;
    if (!customer_id || !street_address || !city || !state || !zip_code) {
        return res.status(400).json({ error: 'All address fields are required' });
    }

    const query = 'INSERT INTO Customer_Address (Customer_ID, street_address, city, state, zip_code, is_default) VALUES (?, ?, ?, ?, ?, TRUE)';
    db.query(query, [customer_id, street_address, city, state, zip_code], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json({ success: true, address_id: results.insertId });
    });
});

app.post('/api/order', (req, res) => {
    const { customer_name, customer_address, customer_phone, customer_email, items, delivery_staff_id } = req.body;
    if (!customer_name || !customer_address || !items?.length) {
        return res.status(400).json({ error: 'Customer and item info required' });
    }

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: 'Transaction error' });

        const nameParts = customer_name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const customerQuery = 'INSERT INTO Customer (first_name, last_name, Email, Phone) VALUES (?, ?, ?, ?)';
        db.query(customerQuery, [firstName, lastName, customer_email, customer_phone], (err, customerResult) => {
            if (err) return db.rollback(() => res.status(500).json({ error: 'Customer error' }));

            const customerId = customerResult.insertId;
            const addressQuery = 'INSERT INTO Customer_Address (Customer_ID, street_address, city, state, zip_code, is_default) VALUES (?, ?, ?, ?, ?, TRUE)';
            db.query(addressQuery, [customerId, customer_address, 'City', 'State', '000000'], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: 'Address error' }));

                let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const orderQuery = 'INSERT INTO Orders (customer_ID, total_amount, final_amount, delivery_address) VALUES (?, ?, ?, ?)';
                db.query(orderQuery, [customerId, total, total, customer_address], (err, orderResult) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: 'Order error' }));

                    const orderId = orderResult.insertId;
                    let itemsProcessed = 0;

                    items.forEach(item => {
                        const subtotal = item.price * item.quantity;
                        const query = 'INSERT INTO Order_Items (Order_ID, Item_ID, quantity, item_price, subtotal) VALUES (?, ?, ?, ?, ?)';
                        db.query(query, [orderId, item.item_id, item.quantity, item.price, subtotal], (err) => {
                            if (err) return db.rollback(() => res.status(500).json({ error: 'Order item error' }));

                            itemsProcessed++;
                            if (itemsProcessed === items.length) {
                                if (delivery_staff_id) {
                                    const deliveryQuery = 'INSERT INTO Delivery (order_ID, staff_ID, delivery_fee) VALUES (?, ?, 50.00)';
                                    db.query(deliveryQuery, [orderId, delivery_staff_id], (err) => {
                                        if (err) return db.rollback(() => res.status(500).json({ error: 'Delivery error' }));
                                        db.commit(err => err ? db.rollback(() => res.status(500).json({ error: 'Commit error' })) : res.json({ success: true, order_id: orderId }));
                                    });
                                } else {
                                    db.commit(err => err ? db.rollback(() => res.status(500).json({ error: 'Commit error' })) : res.json({ success: true, order_id: orderId }));
                                }
                            }
                        });
                    });
                });
            });
        });
    });
});

// Report: Orders by Pincode
app.get('/api/reports/orders-by-pincode', (req, res) => {
    const query = `
        SELECT ca.zip_code, o.Order_ID, o.order_datetime, o.total_amount, o.final_amount 
        FROM Orders o
        JOIN Customer_Address ca ON o.customer_ID = ca.Customer_ID
        WHERE ca.is_default = TRUE
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        const data = {};
        results.forEach(row => {
            if (!data[row.zip_code]) data[row.zip_code] = [];
            data[row.zip_code].push({
                Order_ID: row.Order_ID,
                order_datetime: row.order_datetime,
                total_amount: row.total_amount,
                final_amount: row.final_amount
            });
        });
        res.json(data);
    });
});

// Report: Orders by Date Range
app.post('/api/reports/orders-by-date', (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Start and end dates required' });

    const query = `
        SELECT o.*, c.first_name, c.last_name, ca.zip_code 
        FROM Orders o
        JOIN Customer c ON o.customer_ID = c.Customer_ID
        LEFT JOIN Customer_Address ca ON c.Customer_ID = ca.Customer_ID AND ca.is_default = TRUE
        WHERE o.order_datetime BETWEEN ? AND ?
        ORDER BY o.order_datetime DESC
    `;
    db.query(query, [startDate, endDate], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
});
