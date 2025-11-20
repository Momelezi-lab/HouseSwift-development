from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
from sqlalchemy import func
from datetime import datetime
import smtplib
from email.message import EmailMessage

app = Flask(__name__)

# Production configuration
if os.environ.get('DATABASE_URL'):
    # For production (Render, Heroku, etc.)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL').replace('postgres://', 'postgresql://')
else:
    # For local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CORS configuration for production
CORS(app, 
     origins=[
         "https://house-hero.netlify.app",           # Your Netlify frontend
         "https://house-hero-backend.onrender.com",  # Your Render backend
         "http://localhost:3000",                    # Local development
         "http://127.0.0.1:5000",                   # Local development
         "http://127.0.0.1:5001"                    # Local development
     ],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    registered = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'registered': self.registered
        }

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    time = db.Column(db.String(20), nullable=False)
    service = db.Column(db.String(100), nullable=False)
    details = db.Column(db.String(500))
    status = db.Column(db.String(50), default='pending')
    amount = db.Column(db.Float, default=0.0)
    # Provider assignment fields
    assigned_provider_id = db.Column(db.Integer, nullable=True)
    provider_name = db.Column(db.String(120), nullable=True)
    provider_email = db.Column(db.String(120), nullable=True)
    provider_phone = db.Column(db.String(30), nullable=True)
    priority_level = db.Column(db.String(20), nullable=True)
    cleaning_type = db.Column(db.String(120), nullable=True)
    estimated_price = db.Column(db.Float, nullable=True)
    final_price = db.Column(db.Float, nullable=True)
    commission_amount = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'date': self.date,
            'time': self.time,
            'service': self.service,
            'details': self.details,
            'status': self.status,
            'amount': self.amount,
            'assigned_provider_id': self.assigned_provider_id,
            'provider_name': self.provider_name,
            'provider_email': self.provider_email,
            'provider_phone': self.provider_phone,
            'priority_level': self.priority_level,
            'cleaning_type': self.cleaning_type,
            'estimated_price': self.estimated_price,
            'final_price': self.final_price,
            'commission_amount': self.commission_amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class Complaint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    type = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(1000), nullable=False)
    status = db.Column(db.String(50), default='pending')
    date = db.Column(db.String(20), nullable=False)
    # New fields
    service_provider = db.Column(db.String(255), nullable=True)
    desired_resolution = db.Column(db.String(100), nullable=True)
    contact_preference = db.Column(db.String(50), nullable=True)
    urgency_level = db.Column(db.String(50), nullable=True)
    service_date = db.Column(db.String(20), nullable=True)
    is_anonymous = db.Column(db.Boolean, default=False)
    follow_up_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'date': self.date,
            'service_provider': self.service_provider,
            'desired_resolution': self.desired_resolution,
            'contact_preference': self.contact_preference,
            'urgency_level': self.urgency_level,
            'service_date': self.service_date,
            'is_anonymous': self.is_anonymous,
            'follow_up_enabled': self.follow_up_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ServiceProvider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    service_type = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    experience_years = db.Column(db.Integer, default=0)
    hourly_rate = db.Column(db.Float, default=0.0)
    rating = db.Column(db.Float, default=0.0)
    total_bookings = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='active')
    registered = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'service_type': self.service_type,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'experience_years': self.experience_years,
            'hourly_rate': self.hourly_rate,
            'rating': self.rating,
            'total_bookings': self.total_bookings,
            'status': self.status,
            'registered': self.registered,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


def send_email(to_email: str, subject: str, body: str, reply_to: str = None) -> bool:
    """Send a plain-text email using SMTP. Relies on environment variables:
    EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
    Returns True on success, False otherwise.
    """
    EMAIL_HOST = os.environ.get('EMAIL_HOST')
    if not EMAIL_HOST:
        # Email not configured
        print('send_email: EMAIL_HOST not set; skipping email')
        return False

    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USER = os.environ.get('EMAIL_USER')
    EMAIL_PASS = os.environ.get('EMAIL_PASS')
    EMAIL_FROM = os.environ.get('EMAIL_FROM', EMAIL_USER)

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        if reply_to:
            msg['Reply-To'] = reply_to
        msg.set_content(body)

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as smtp:
            smtp.starttls()
            if EMAIL_USER and EMAIL_PASS:
                smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print('send_email error:', e)
        return False

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'message': 'House Hero Backend is running!'})

@app.route('/')
def home():
    return jsonify({'message': 'House Hero Backend API', 'status': 'running'})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone')
    registered = datetime.now().strftime('%Y-%m-%d')
    if not name or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    password_hash = generate_password_hash(password)
    user = User(name=name, email=email, password_hash=password_hash, phone=phone, registered=registered)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Login successful', 'user': user.to_dict()})
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.get_json()
    # Improved duplicate check: case-insensitive, trimmed
    existing = Booking.query.filter(
        func.lower(func.trim(Booking.name)) == data.get('name', '').strip().lower(),
        Booking.date == data.get('date'),
        Booking.time == data.get('time'),
        func.lower(func.trim(Booking.service)) == data.get('service', '').strip().lower()
    ).first()
    if existing:
        return jsonify({'error': 'Duplicate booking detected'}), 409
    booking = Booking(
        name=data.get('name'),
        address=data.get('address'),
        date=data.get('date'),
        time=data.get('time'),
        service=data.get('service'),
        details=data.get('details'),
        status=data.get('status', 'pending'),
        amount=float(data.get('amount', 0.0))
    )
    db.session.add(booking)
    db.session.commit()
    # Try sending customer and admin notifications
    try:
        ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
        EMAIL_FROM = os.environ.get('EMAIL_FROM')

        # Customer email (if provided in request payload)
        customer_email = data.get('email')
        customer_name = data.get('name')

        if customer_email:
            cust_subject = 'Your service request has been received - HomeSwift'
            cust_body = (
                f"Hi {customer_name},\n\n"
                "Thank you for booking with HomeSwift!\n\n"
                "Your Request Details:\n"
                f"- Service Type: {data.get('service')}\n"
                f"- Date: {data.get('date')}\n"
                f"- Location: {data.get('address')}\n"
                "- Status: Pending Confirmation\n\n"
                "We're finding the best provider for you and will confirm within 2 hours.\n\n"
                f"Request ID: {booking.id}\n\n"
                "Questions? Reply to this email.\n\n"
                "- HomeSwift Team"
            )
            send_email(customer_email, cust_subject, cust_body, reply_to=EMAIL_FROM)

        # Admin notification
        if ADMIN_EMAIL:
            admin_subject = f"NEW BOOKING: {data.get('service')} - {data.get('address')}"
            admin_body = (
                "New service request received!\n\n"
                f"Customer: {data.get('name')}\n"
                f"Phone: {data.get('phone')}\n"
                f"Email: {data.get('email')}\n"
                f"Service: {data.get('service')}\n"
                f"Date: {data.get('date')}\n"
                f"Time: {data.get('time')}\n"
                f"Address: {data.get('address')}\n"
                f"Description: {data.get('details')}\n"
                f"Priority: {data.get('priority_level', 'normal')}\n\n"
                f"Request ID: {booking.id}\n\n"
                "ACTION REQUIRED: Assign a provider and confirm booking."
            )
            send_email(ADMIN_EMAIL, admin_subject, admin_body, reply_to=EMAIL_FROM)
    except Exception as e:
        print('Error sending booking emails:', e)

    return jsonify({'message': 'Booking created', 'booking': booking.to_dict()}), 201

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    bookings = Booking.query.all()
    return jsonify([b.to_dict() for b in bookings])

@app.route('/api/bookings/<int:booking_id>', methods=['PATCH'])
def update_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.get_json()
    if 'status' in data:
        booking.status = data['status']
    db.session.commit()
    return jsonify({'message': 'Booking updated', 'booking': booking.to_dict()})

@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
def delete_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    db.session.delete(booking)
    db.session.commit()
    return jsonify({'message': 'Booking deleted'})

@app.route('/api/complaints', methods=['POST'])
def create_complaint():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'type', 'title', 'description', 'date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    complaint = Complaint(
        name=data.get('name'),
        email=data.get('email'),
        type=data.get('type'),
        title=data.get('title'),
        description=data.get('description'),
        status=data.get('status', 'pending'),
        date=data.get('date'),
        service_provider=data.get('serviceProvider'),
        desired_resolution=data.get('desiredResolution'),
        contact_preference=data.get('contactPreference'),
        urgency_level=data.get('urgencyLevel'),
        service_date=data.get('serviceDate'),
        is_anonymous=data.get('anonymous', False),
        follow_up_enabled=data.get('followUp', True)
    )
    db.session.add(complaint)
    db.session.commit()
    return jsonify({'message': 'Complaint created', 'complaint': complaint.to_dict()}), 201

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    complaints = Complaint.query.all()
    return jsonify([c.to_dict() for c in complaints])

@app.route('/api/complaints/<int:complaint_id>', methods=['PATCH'])
def update_complaint(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    data = request.get_json()
    
    # Update fields if provided
    updateable_fields = [
        'status', 'service_provider', 'desired_resolution', 'contact_preference',
        'urgency_level', 'service_date', 'is_anonymous', 'follow_up_enabled',
        'title', 'description', 'type'
    ]
    
    for field in updateable_fields:
        if field in data:
            setattr(complaint, field, data[field])
    
    # Update the updated_at timestamp
    complaint.updated_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify({'message': 'Complaint updated', 'complaint': complaint.to_dict()})

@app.route('/api/complaints/<int:complaint_id>', methods=['GET'])
def get_complaint(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    return jsonify(complaint.to_dict())

@app.route('/api/complaints/<int:complaint_id>', methods=['DELETE'])
def delete_complaint(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    db.session.delete(complaint)
    db.session.commit()
    return jsonify({'message': 'Complaint deleted'})

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    # Update fields if provided
    updateable_fields = ['name', 'email', 'phone']
    
    for field in updateable_fields:
        if field in data and data[field] is not None:
            setattr(user, field, data[field])
    
    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@app.route('/api/providers', methods=['POST'])
def create_provider():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'service_type', 'phone', 'email']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Check if email already exists
    if ServiceProvider.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    provider = ServiceProvider(
        name=data.get('name'),
        service_type=data.get('service_type'),
        phone=data.get('phone'),
        email=data.get('email'),
        address=data.get('address'),
        experience_years=data.get('experience_years', 0),
        hourly_rate=float(data.get('hourly_rate', 0.0)),
        rating=float(data.get('rating', 0.0)),
        total_bookings=data.get('total_bookings', 0),
        status=data.get('status', 'active'),
        registered=datetime.now().strftime('%Y-%m-%d')
    )
    db.session.add(provider)
    db.session.commit()
    return jsonify({'message': 'Provider created', 'provider': provider.to_dict()}), 201

@app.route('/api/providers', methods=['GET'])
def get_providers():
    providers = ServiceProvider.query.all()
    return jsonify([p.to_dict() for p in providers])

@app.route('/api/providers/<int:provider_id>', methods=['PATCH'])
def update_provider(provider_id):
    provider = ServiceProvider.query.get_or_404(provider_id)
    data = request.get_json()
    
    # Update fields if provided
    updateable_fields = [
        'name', 'service_type', 'phone', 'email', 'address', 
        'experience_years', 'hourly_rate', 'rating', 'total_bookings', 'status'
    ]
    
    for field in updateable_fields:
        if field in data and data[field] is not None:
            if field in ['experience_years', 'total_bookings']:
                setattr(provider, field, int(data[field]))
            elif field in ['hourly_rate', 'rating']:
                setattr(provider, field, float(data[field]))
            else:
                setattr(provider, field, data[field])
    
    # Update the updated_at timestamp
    provider.updated_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify({'message': 'Provider updated', 'provider': provider.to_dict()})

@app.route('/api/providers/<int:provider_id>', methods=['DELETE'])
def delete_provider(provider_id):
    provider = ServiceProvider.query.get_or_404(provider_id)
    db.session.delete(provider)
    db.session.commit()
    return jsonify({'message': 'Provider deleted'})


@app.route('/api/bookings/<int:booking_id>/assign', methods=['POST'])
def assign_provider(booking_id):
    """Assign a provider to a booking and notify provider + customer.
    Body: { provider_id: int, priority_level?: str, estimated_price?: float }
    """
    booking = Booking.query.get_or_404(booking_id)
    data = request.get_json()
    provider_id = data.get('provider_id')
    if not provider_id:
        return jsonify({'error': 'provider_id required'}), 400
    provider = ServiceProvider.query.get_or_404(provider_id)

    booking.assigned_provider_id = provider.id
    booking.provider_name = provider.name
    booking.provider_email = provider.email
    booking.provider_phone = provider.phone
    booking.priority_level = data.get('priority_level')
    booking.estimated_price = float(data.get('estimated_price')) if data.get('estimated_price') else None
    booking.status = 'confirmed'
    db.session.commit()

    # Notify provider
    try:
        EMAIL_FROM = os.environ.get('EMAIL_FROM')
        provider_subject = f"New Job Assignment - HomeSwift - {booking.date}"
        provider_body = (
            f"Hi {provider.name},\n\n"
            "You have a new job assignment!\n\n"
            "Job Details:\n"
            f"- Service: {booking.service} - {booking.cleaning_type or ''}\n"
            f"- Date: {booking.date}\n"
            f"- Time: {booking.time}\n"
            f"- Location: {booking.address}\n"
            f"- Customer: {booking.name} - {getattr(booking, 'phone', '')}\n\n"
            "Job Description:\n"
            f"{booking.details}\n\n"
            f"Priority: {booking.priority_level or 'normal'}\n\n"
            "PLEASE CONFIRM:\n"
            f"Reply to this email or call {EMAIL_FROM} to confirm you can take this job.\n\n"
            f"Customer expects you at {booking.time} on {booking.date}.\n\n"
            f"Job ID: {booking.id}"
        )
        send_email(provider.email, provider_subject, provider_body, reply_to=EMAIL_FROM)
    except Exception as e:
        print('Error sending provider email:', e)

    # Notify customer (if email present)
    try:
        customer_email = request.get_json().get('customer_email') or None
        if not customer_email:
            # fallback to data payload field 'email' if present
            customer_email = request.get_json().get('email') or None
        if customer_email:
            cust_subject = 'Your service is confirmed! - HomeSwift'
            cust_body = (
                f"Hi {booking.name},\n\n"
                "Great news! Your service has been confirmed.\n\n"
                "Booking Details:\n"
                f"- Service: {booking.service}\n"
                f"- Date: {booking.date}\n"
                f"- Time: {booking.time}\n"
                f"- Provider: {provider.name}\n"
                f"- Provider Contact: {provider.phone}\n\n"
                f"Your provider will arrive at the scheduled time.\n\n"
                f"Estimated Price: R{booking.estimated_price or 'TBD'}\n\n"
                "Need to reschedule? Reply to this email or call us.\n\n"
                f"Request ID: {booking.id}\n\n"
                "- HomeSwift Team"
            )
            send_email(customer_email, cust_subject, cust_body, reply_to=EMAIL_FROM)
    except Exception as e:
        print('Error sending customer confirmation email:', e)

    return jsonify({'message': 'Provider assigned and notifications sent', 'booking': booking.to_dict()})

if __name__ == '__main__':
    import sys
    with app.app_context():
        db.create_all()
        if '--cleanup-duplicates' in sys.argv:
            # Remove duplicate bookings
            from sqlalchemy import and_
            seen = set()
            duplicates = []
            for b in Booking.query.order_by(Booking.id).all():
                key = (b.name.strip().lower(), b.date, b.time, b.service.strip().lower())
                if key in seen:
                    duplicates.append(b)
                else:
                    seen.add(key)
            for dup in duplicates:
                db.session.delete(dup)
            db.session.commit()
            print("Removed {} duplicate bookings.".format(len(duplicates)))
        else:
            # Get port from environment variable (for Render) or use 5001 for local
            port = int(os.environ.get('PORT', 5001))
            app.run(debug=False, host='0.0.0.0', port=port)
