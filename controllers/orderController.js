const getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fixed Supabase query
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    quantity,
                    price,
                    vegetables:vegetable_id (
                        id,
                        name,
                        image_url
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data structure to match the template expectations
        const transformedOrders = orders.map(order => ({
            ...order,
            items: order.order_items.map(item => ({
                ...item,
                vegetables: item.vegetables
            }))
        }));

        res.render('user/orders', { orders: transformedOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.render('user/orders', { 
            orders: [], 
            error: 'Failed to fetch orders. Please try again.' 
        });
    }
};

const createOrder = async (req, res) => {
    try {
        const { items, totalAmount } = req.body;
        const userId = req.user.id;

        // Start a transaction
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                total_amount: totalAmount,
                status: 'pending',
                created_at: new Date()
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Insert order items
        const orderItems = items.map(item => ({
            order_id: order.id,
            vegetable_id: item.vegetableId,
            quantity: item.quantity,
            price: item.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        res.json({ success: true, orderId: order.id });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create order' 
        });
    }
}; 