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
    password: 'password', // Change this to your MySQL password
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

// API Routes

// Get all catalogue items
app.get('/api/catalogue', (req, res) => {
    const query = 'SELECT * FROM Catalogue WHERE is_active = TRUE ORDER BY Name';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching catalogue items:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(results);
    });
});

// Get all delivery staff
app.get('/api/delivery-staff', (req, res) => {
    const query = 'SELECT * FROM Delivery_Staff WHERE is_active = TRUE ORDER BY name';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching delivery staff:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(results);
    });
});

// Add new catalogue item
app.post('/api/catalogue', (req, res) => {
    const { name, description, price, is_vegetarian } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' });
    }

    const query = 'INSERT INTO Catalogue (Name, Description, price, is_vegetarian) VALUES (?, ?, ?, ?)';
    db.query(query, [name, description, price, is_vegetarian || false], (err, results) => {
        if (err) {
            console.error('Error adding catalogue item:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json({ 
            success: true, 
            message: 'Item added successfully',
            item_id: results.insertId
        });
    });
});

// Add new customer
app.post('/api/customer', (req, res) => {
    const { first_name, last_name, email, phone } = req.body;
    
    if (!first_name || !last_name) {
        return res.status(400).json({ error: 'First name and last name are required' });
    }

    const query = 'INSERT INTO Customer (first_name, last_name, Email, Phone) VALUES (?, ?, ?, ?)';
    db.query(query, [first_name, last_name, email, phone], (err, results) => {
        if (err) {
            console.error('Error adding customer:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json({ 
            success: true, 
            message: 'Customer added successfully',
            customer_id: results.insertId
        });
    });
});

// Add customer address
app.post('/api/customer-address', (req, res) => {
    const { customer_id, street_address, city, state, zip_code } = req.body;
    
    if (!customer_id || !street_address || !city || !state || !zip_code) {
        return res.status(400).json({ error: 'All address fields are required' });
    }

    const query = 'INSERT INTO Customer_Address (Customer_ID, street_address, city, state, zip_code, is_default) VALUES (?, ?, ?, ?, ?, TRUE)';
    db.query(query, [customer_id, street_address, city, state, zip_code], (err, results) => {
        if (err) {
            console.error('Error adding customer address:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json({ 
            success: true, 
            message: 'Address added successfully',
            address_id: results.insertId
        });
    });
});

// Add new order
app.post('/api/order', (req, res) => {
    const { customer_name, customer_address, customer_phone, customer_email, items, delivery_staff_id } = req.body;
    
    if (!customer_name || !customer_address || !items || items.length === 0) {
        return res.status(400).json({ error: 'Customer details and items are required' });
    }

    // Start transaction
    db.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // First, add customer
        const customerQuery = 'INSERT INTO Customer (first_name, last_name, Email, Phone) VALUES (?, ?, ?, ?)';
        const nameParts = customer_name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        db.query(customerQuery, [firstName, lastName, customer_email, customer_phone], (err, customerResult) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Error adding customer:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
            }

            const customerId = customerResult.insertId;

            // Add customer address
            const addressQuery = 'INSERT INTO Customer_Address (Customer_ID, street_address, city, state, zip_code, is_default) VALUES (?, ?, ?, ?, ?, TRUE)';
            db.query(addressQuery, [customerId, customer_address, 'City', 'State', '000000'], (err, addressResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error adding address:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    });
                }

                // Calculate total amount
                let totalAmount = 0;
                items.forEach(item => {
                    totalAmount += item.price * item.quantity;
                });

                // Create order
                const orderQuery = 'INSERT INTO Orders (customer_ID, total_amount, final_amount, delivery_address) VALUES (?, ?, ?, ?)';
                db.query(orderQuery, [customerId, totalAmount, totalAmount, customer_address], (err, orderResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error creating order:', err);
                            res.status(500).json({ error: 'Internal server error' });
                        });
                    }

                    const orderId = orderResult.insertId;

                    // Add order items
                    let itemsProcessed = 0;
                    items.forEach(item => {
                        const orderItemQuery = 'INSERT INTO Order_Items (Order_ID, Item_ID, quantity, item_price, subtotal) VALUES (?, ?, ?, ?, ?)';
                        const subtotal = item.price * item.quantity;
                        
                        db.query(orderItemQuery, [orderId, item.item_id, item.quantity, item.price, subtotal], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('Error adding order item:', err);
                                    res.status(500).json({ error: 'Internal server error' });
                                });
                            }

                            itemsProcessed++;
                            if (itemsProcessed === items.length) {
                                // Create delivery record if staff assigned
                                if (delivery_staff_id) {
                                    const deliveryQuery = 'INSERT INTO Delivery (order_ID, staff_ID, delivery_fee) VALUES (?, ?, ?)';
                                    db.query(deliveryQuery, [orderId, delivery_staff_id, 50.00], (err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error('Error creating delivery:', err);
                                                res.status(500).json({ error: 'Internal server error' });
                                            });
                                        }

                                        // Commit transaction
                                        db.commit((err) => {
                                            if (err) {
                                                return db.rollback(() => {
                                                    console.error('Error committing transaction:', err);
                                                    res.status(500).json({ error: 'Internal server error' });
                                                });
                                            }
                                            res.json({ 
                                                success: true, 
                                                message: 'Order created successfully',
                                                order_id: orderId
                                            });
                                        });
                                    });
                                } else {
                                    // Commit transaction without delivery
                                    db.commit((err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error('Error committing transaction:', err);
                                                res.status(500).json({ error: 'Internal server error' });
                                            });
                                        }
                                        res.json({ 
                                            success: true, 
                                            message: 'Order created successfully',
                                            order_id: orderId
                                        });
                                    });
                                }
                            }
                        });
                    });
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
});