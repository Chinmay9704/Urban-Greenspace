const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Add Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper function for order count
async function getOrderCount(userId) {
    const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);
    return count || 0;
}

// Ensure directories exist
const ensureDirectoryExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

// Create necessary directories
ensureDirectoryExists(path.join(__dirname, '../public/pdfs'));
ensureDirectoryExists(path.join(__dirname, '../public/images'));

// Route to display marketplace
router.get('/marketplace', isAuthenticated, async (req, res) => {
    try {
        const [{ data: vegetables, error }, orderCount] = await Promise.all([
            supabase
                .from('vegetables')
                .select('*')
                .gt('stock_quantity', 0)
                .order('name'),
            getOrderCount(req.session.user.id)
        ]);

        if (error) throw error;

        res.render('user/marketplace', { 
            vegetables,
            orderCount,
            user: req.session.user,
            currentPage: 'marketplace'
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('user/marketplace', { 
            vegetables: [],
            orderCount: 0,
            error: 'Failed to fetch data',
            user: req.session.user,
            currentPage: 'marketplace'
        });
    }
});

// Route to display shopping cart
router.get('/cart', isAuthenticated, async (req, res) => {
    try {
        const [{ data: cartItems, error }, orderCount] = await Promise.all([
            supabase
                .from('cart_items')
                .select(`
                    *,
                    vegetables (*)
                `)
                .eq('user_id', req.session.user.id),
            getOrderCount(req.session.user.id)
        ]);

        if (error) throw error;

        res.render('user/cart', { 
            cartItems,
            orderCount,
            user: req.session.user,
            currentPage: 'cart'
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('user/cart', { 
            cartItems: [],
            orderCount: 0,
            error: 'Failed to fetch cart',
            user: req.session.user,
            currentPage: 'cart'
        });
    }
});

// Route to add item to cart
router.post('/cart/add', isAuthenticated, async (req, res) => {
    try {
        const { vegetableId, quantity } = req.body;
        const userId = req.session.user.id;

        // Check if item already exists in cart
        const { data: existingItem, error: checkError } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId)
            .eq('vegetable_id', vegetableId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existingItem) {
            // Update quantity if item exists
            const { error: updateError } = await supabase
                .from('cart_items')
                .update({ quantity: existingItem.quantity + parseInt(quantity) })
                .eq('id', existingItem.id);

            if (updateError) throw updateError;
        } else {
            // Insert new item if it doesn't exist
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert([{
                    user_id: userId,
                    vegetable_id: vegetableId,
                    quantity: parseInt(quantity)
                }]);

            if (insertError) throw insertError;
        }

        // Get updated cart count
        const { count, error: countError } = await supabase
            .from('cart_items')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);

        if (countError) throw countError;

        res.json({ success: true, cartCount: count });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// Route to get cart count
router.get('/cart/count', isAuthenticated, async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('cart_items')
            .select('*', { count: 'exact' })
            .eq('user_id', req.session.user.id);

        if (error) throw error;

        res.json({ count: count || 0 });
    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({ error: 'Failed to get cart count' });
    }
});

// Update cart item quantity
router.put('/cart/update/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        
        const { error } = await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('id', id)
            .eq('user_id', req.session.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove item from cart
router.delete('/cart/remove/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', id)
            .eq('user_id', req.session.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// User Orders Route
router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        // Debug: Log the user ID we're searching for
        console.log('Fetching orders for user:', req.session.user.id);

        // First fetch orders with a simpler query
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', req.session.user.id);

        if (error) {
            console.error('Orders fetch error:', error);
            return res.render('user/orders', {
                orders: [],
                error: 'Failed to load orders',
                currentPage: 'orders',
                user: req.session.user
            });
        }

        // Debug: Log the fetched orders
        console.log('Fetched orders:', orders);

        // Process the orders into the required format
        const processedOrders = orders.map(order => ({
            id: order.id,
            status: order.status || 'pending',
            created_at: order.created_at,
            total_amount: order.total_amount || 0,
            delivery_fee: order.delivery_fee || 50,
            items: [], // We'll fetch items separately if needed
            delivery_address: order.delivery_address,
            payment_status: order.payment_status || 'pending'
        }));

        // Render the orders page
        res.render('user/orders', {
            orders: processedOrders,
            currentPage: 'orders',
            user: req.session.user
        });

    } catch (error) {
        console.error('Error in orders route:', error);
        res.render('user/orders', {
            orders: [],
            error: 'An error occurred while loading your orders',
            currentPage: 'orders',
            user: req.session.user
        });
    }
});

// Get single order details
router.get('/orders/:id/details', isAuthenticated, async (req, res) => {
    try {
        // Debug: Log the order ID we're looking for
        console.log('Fetching details for order:', req.params.id);

        // Fetch the basic order details
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.session.user.id)
            .single();

        if (error) {
            console.error('Order fetch error:', error);
            throw error;
        }

        // Debug: Log the fetched order
        console.log('Found order:', order);

        res.json(order);

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch order details',
            details: error.message 
        });
    }
});

// Update the create-order route
router.post('/create-order', isAuthenticated, async (req, res) => {
    try {
        // Get cart items
        const { data: cartItems, error: cartError } = await supabase
            .from('cart_items')
            .select(`
                *,
                vegetables (*)
            `)
            .eq('user_id', req.session.user.id);

        if (cartError) throw cartError;
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate total
        const subtotal = cartItems.reduce((sum, item) => {
            return sum + (item.vegetables.price * item.quantity);
        }, 0);
        
        const deliveryFee = 50.00; // Fixed delivery fee
        const tax = subtotal * 0.05;  // 5% tax
        const total = subtotal + deliveryFee + tax;

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(total * 100), // Convert to paise
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });

        // Create order in database
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: req.session.user.id,
                total_amount: total,
                delivery_fee: deliveryFee,  // Add delivery fee
                subtotal: subtotal,         // Add subtotal
                tax: tax,                   // Add tax
                status: 'pending',
                razorpay_order_id: razorpayOrder.id
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = cartItems.map(item => ({
            order_id: order.id,
            vegetable_id: item.vegetable_id,
            quantity: item.quantity,
            price: item.vegetables.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Clear cart after successful order creation
        const { error: clearCartError } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', req.session.user.id);

        if (clearCartError) throw clearCartError;

        res.json({
            orderId: order.id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            subtotal,
            deliveryFee,
            tax,
            total
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Order success page
router.get('/order-success', isAuthenticated, (req, res) => {
    res.render('user/order-success', {
        user: req.session.user,
        currentPage: 'orders'
    });
});

// Verify payment route
router.post('/verify-payment', isAuthenticated, async (req, res) => {
    try {
        const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Update order status
        const { error: orderError } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                payment_id: razorpay_payment_id
            })
            .eq('id', orderId);

        if (orderError) throw orderError;

        // Clear cart
        const { error: clearError } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', req.session.user.id);

        if (clearError) throw clearError;

        res.json({ 
            success: true,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Payment verification failed'
        });
    }
});

// PDF generation route
router.get('/orders/:orderId/pdf', isAuthenticated, async (req, res) => {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                items:order_items (
                    *,
                    vegetables:vegetable_id (*)
                )
            `)
            .eq('id', req.params.orderId)
            .eq('user_id', req.session.user.id)
            .single();

        if (error || !order) {
            throw new Error('Order not found');
        }

        // Create PDF
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });

        // Set up PDF generation
        const pdfPath = path.join(__dirname, `../public/pdfs/order-${order.id.slice(-8)}.pdf`);
        const writeStream = fs.createWriteStream(pdfPath);

        doc.pipe(writeStream);
        doc.pipe(res);

        // Add PDF content
        doc.fontSize(20).text('Order Receipt', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${order.id}`);
        doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`);
        doc.moveDown();

        // Add items
        doc.text('Items:', { underline: true });
        order.items.forEach(item => {
            doc.text(`${item.vegetables.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`);
        });

        doc.moveDown();
        doc.text(`Subtotal: ₹${order.total_amount.toFixed(2)}`);
        doc.text(`Delivery Fee: ₹${order.delivery_fee.toFixed(2)}`);
        doc.text(`Tax (5%): ₹${order.tax.toFixed(2)}`);
        doc.text(`Total: ₹${order.total_amount.toFixed(2)}`, { bold: true });

        // Finalize PDF
        doc.end();

        // Cleanup
        writeStream.on('finish', () => {
            fs.unlink(pdfPath, (err) => {
                if (err) console.error('Error deleting temporary PDF:', err);
            });
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Failed to generate PDF');
    }
});

// Update user profile
router.put('/update-profile', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const updateData = req.body;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        // Update session user data
        req.session.user = { ...req.session.user, ...updateData };

        res.json(data);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Add this route to handle user logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/user/dashboard');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/login'); // or wherever your main login page is
    });
});

module.exports = router; 