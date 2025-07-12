-- Database Schema for Restaurant Management System

CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

-- Customer table
CREATE TABLE IF NOT EXISTS Customer (
    Customer_ID INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE,
    Phone VARCHAR(15),
    Loyalty_points INT DEFAULT 0,
    is_Premium BOOLEAN DEFAULT FALSE,
    Premium_Since DATE
);

-- Customer Address table
CREATE TABLE IF NOT EXISTS Customer_Address (
    Address_ID INT AUTO_INCREMENT PRIMARY KEY,
    Customer_ID INT,
    address_type ENUM('home', 'work', 'other') DEFAULT 'home',
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID) ON DELETE CASCADE
);

-- Catalogue table
CREATE TABLE IF NOT EXISTS Catalogue (
    Item_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_discountable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Staff table
CREATE TABLE IF NOT EXISTS Delivery_Staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    vehicle_type VARCHAR(50),
    last_evaluated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS Orders (
    Order_ID INT AUTO_INCREMENT PRIMARY KEY,
    transaction_ID VARCHAR(100) UNIQUE,
    customer_ID INT,
    order_type ENUM('dine_in', 'takeout', 'delivery') DEFAULT 'delivery',
    order_status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
    order_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    final_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_method ENUM('cash', 'card', 'online', 'wallet') DEFAULT 'cash',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    delivery_address TEXT,
    FOREIGN KEY (customer_ID) REFERENCES Customer(Customer_ID)
);

-- Order Items table (junction table for orders and catalogue items)
CREATE TABLE IF NOT EXISTS Order_Items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    Order_ID INT,
    Item_ID INT,
    quantity INT NOT NULL DEFAULT 1,
    item_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES Catalogue(Item_ID)
);

-- Delivery table
CREATE TABLE IF NOT EXISTS Delivery (
    delivery_ID INT AUTO_INCREMENT PRIMARY KEY,
    order_ID INT,
    staff_ID INT,
    delivery_status ENUM('assigned', 'picked_up', 'on_way', 'delivered', 'failed') DEFAULT 'assigned',
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    delivery_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_ID) REFERENCES Orders(Order_ID),
    FOREIGN KEY (staff_ID) REFERENCES Delivery_Staff(staff_id)
);

-- Insert sample delivery staff
INSERT INTO Delivery_Staff (name, email, phone, vehicle_type) VALUES 
('Rahul Kumar', 'rahul@restaurant.com', '9876543210', 'Motorcycle'),
('Priya Singh', 'priya@restaurant.com', '9876543211', 'Bicycle'),
('Amit Sharma', 'amit@restaurant.com', '9876543212', 'Car'),
('Sneha Patel', 'sneha@restaurant.com', '9876543213', 'Motorcycle');

-- Insert sample catalogue items
INSERT INTO Catalogue (Name, Description, price, is_vegetarian) VALUES 
('Butter Chicken', 'Creamy tomato-based chicken curry', 320.00, FALSE),
('Paneer Tikka', 'Grilled cottage cheese with spices', 280.00, TRUE),
('Biryani', 'Fragrant rice dish with meat/vegetables', 350.00, FALSE),
('Dal Tadka', 'Lentils tempered with spices', 180.00, TRUE),
('Naan', 'Fresh bread baked in tandoor', 45.00, TRUE);