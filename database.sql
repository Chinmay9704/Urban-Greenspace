-- Drop existing tables if they exist (with CASCADE)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS delivery_info CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Create orders table with proper foreign key relationship
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(10,8),
    estimated_delivery_time VARCHAR(50),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
);

-- Create order_items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    vegetable_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order
        FOREIGN KEY(order_id) 
        REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vegetable
        FOREIGN KEY(vegetable_id) 
        REFERENCES vegetables(id)
        ON DELETE CASCADE
);

-- Create delivery_info table
CREATE TABLE delivery_info (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    delivery_status VARCHAR(50),
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(10,8),
    estimated_arrival TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_delivery
        FOREIGN KEY(order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_vegetable_id ON order_items(vegetable_id);
CREATE INDEX idx_delivery_info_order_id ON delivery_info(order_id); 