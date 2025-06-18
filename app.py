from flask import Flask, render_template, request, redirect, url_for, session, flash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    # Simple authentication for demonstration
    if username and password:
        session['username'] = username
        session['role'] = 'customer'  # Default role
        return redirect(url_for('dashboard'))
    return redirect(url_for('index'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        role = request.form.get('role')
        
        # Here you would normally save to database
        # For demo, just show success message
        flash('Registration successful! Welcome to Greens Cart', 'success')
        return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html')

@app.route('/products')
def products():
    if 'username' not in session:
        return redirect(url_for('index'))
    # Dummy product data for demonstration
    products = [
        {'name': 'Fresh Spinach', 'price': 2.99, 'description': 'Organic spinach leaves', 'stock': 50},
        {'name': 'Lettuce', 'price': 1.99, 'description': 'Crisp lettuce heads', 'stock': 30},
        {'name': 'Kale', 'price': 3.49, 'description': 'Fresh local kale', 'stock': 40}
    ]
    return render_template('products.html', products=products)

@app.route('/add_to_cart/<product_name>')
def add_to_cart(product_name):
    if 'username' not in session:
        return redirect(url_for('index'))
    return redirect(url_for('products'))

@app.route('/farmers')
def farmers():
    if 'username' not in session:
        return redirect(url_for('index'))
    # Dummy farmer data for demonstration
    farmers = [
        {'username': 'John\'s Farm'},
        {'username': 'Green Acres'},
        {'username': 'Local Harvest'}
    ]
    return render_template('farmers.html', farmers=farmers)

@app.route('/farmer-land/<farmer_name>')
def farmer_land(farmer_name):
    if 'username' not in session:
        return redirect(url_for('index'))
    
    # Dummy farmer land data for demonstration
    farmer_details = {
        'John\'s Farm': {
            'name': 'John Smith',
            'location': 'Riverside County, California',
            'soil_type': 'Loamy Soil',
            'land_size': '15 acres',
            'crops': 'Spinach, Lettuce, Kale',
            'coordinates': {'lat': 33.9533, 'lng': -117.3961}
        },
        'Green Acres': {
            'name': 'Sarah Johnson',
            'location': 'Sacramento Valley, California',
            'soil_type': 'Clay Loam',
            'land_size': '20 acres',
            'crops': 'Tomatoes, Peppers, Herbs',
            'coordinates': {'lat': 38.5816, 'lng': -121.4944}
        },
        'Local Harvest': {
            'name': 'Mike Wilson',
            'location': 'Sonoma County, California',
            'soil_type': 'Sandy Loam',
            'land_size': '12 acres',
            'crops': 'Root Vegetables, Greens',
            'coordinates': {'lat': 38.5780, 'lng': -122.9888}
        }
    }
    
    farmer = farmer_details.get(farmer_name, {})
    return render_template('farmer_land.html', farmer=farmer)

@app.route('/farmer-details/<farmer_name>')
def farmer_details(farmer_name):
    if 'username' not in session:
        return redirect(url_for('index'))
    
    # Dummy farmer details data for demonstration
    farmer_info = {
        'John\'s Farm': {
            'owner_name': 'John Smith',
            'contact_number': '+1 (555) 123-4567',
            'email': 'john@johnsfarm.com',
            'lands': [
                {
                    'land_number': 'LN001',
                    'location': 'Riverside County, Plot A',
                    'area': '8 acres',
                    'registration_number': 'REG123456'
                },
                {
                    'land_number': 'LN002',
                    'location': 'Riverside County, Plot B',
                    'area': '7 acres',
                    'registration_number': 'REG123457'
                }
            ]
        },
        # Add more farmer details as needed
    }
    
    farmer = farmer_info.get(farmer_name, {})
    return render_template('farmer_details.html', farmer=farmer, farmer_name=farmer_name)

@app.route('/farmer-profile/<farmer_name>')
def farmer_profile(farmer_name):
    if 'username' not in session:
        return redirect(url_for('index'))
    
    # Dummy comprehensive farmer profiles
    farmer_profiles = {
        'John\'s Farm': {
            'name': 'John Smith',
            'years_farming': 15,
            'specialty': 'Organic Leafy Greens',
            'bio': 'Third-generation farmer specializing in sustainable organic farming practices.',
            'certifications': ['Organic Certified', 'Sustainable Agriculture'],
            'products': [
                {'name': 'Spinach', 'price': 2.99, 'unit': 'bunch'},
                {'name': 'Kale', 'price': 3.49, 'unit': 'bunch'},
                {'name': 'Lettuce', 'price': 1.99, 'unit': 'head'}
            ],
            'contact': {
                'email': 'john@johnsfarm.com',
                'phone': '+1 (555) 123-4567',
                'address': 'Riverside County, California'
            }
        },
        'Green Acres': {
            'name': 'Sarah Johnson',
            'years_farming': 8,
            'specialty': 'Heirloom Vegetables',
            'bio': 'Passionate about preserving heirloom varieties and teaching sustainable farming.',
            'certifications': ['Organic Certified', 'Heirloom Seed Preservation'],
            'products': [
                {'name': 'Tomatoes', 'price': 4.99, 'unit': 'lb'},
                {'name': 'Peppers', 'price': 3.99, 'unit': 'lb'},
                {'name': 'Herbs', 'price': 2.49, 'unit': 'bunch'}
            ],
            'contact': {
                'email': 'sarah@greenacres.com',
                'phone': '+1 (555) 234-5678',
                'address': 'Sacramento Valley, California'
            }
        },
        'Local Harvest': {
            'name': 'Mike Wilson',
            'years_farming': 12,
            'specialty': 'Root Vegetables',
            'bio': 'Focused on sustainable soil management and crop rotation techniques.',
            'certifications': ['Sustainable Farming', 'Soil Conservation'],
            'products': [
                {'name': 'Carrots', 'price': 2.49, 'unit': 'lb'},
                {'name': 'Potatoes', 'price': 3.99, 'unit': '5lb'},
                {'name': 'Beets', 'price': 2.99, 'unit': 'bunch'}
            ],
            'contact': {
                'email': 'mike@localharvest.com',
                'phone': '+1 (555) 345-6789',
                'address': 'Sonoma County, California'
            }
        }
    }
    
    farmer = farmer_profiles.get(farmer_name)
    return render_template('farmer_profile.html', farmer=farmer, farmer_name=farmer_name)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
