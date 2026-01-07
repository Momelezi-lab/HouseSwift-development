# Profile Models Implementation

## ✅ Implemented

### Backend

1. **Customer Profile API** (`/api/profiles/customer`)
   - `GET` - Get customer profile for authenticated user
   - `PUT` - Create or update customer profile
   - Fields: address, city, postalCode, preferredContactMethod

2. **Provider Profile API** (`/api/profiles/provider`)
   - `GET` - Get provider profile for authenticated user
   - `PUT` - Create or update provider profile
   - Fields: bankName, bankAccountNumber, bankAccountType, idNumber, taxNumber, businessRegistration
   - Verification status: pending, verified, rejected

3. **Provider Verification API** (`/api/profiles/provider/[id]/verify`)
   - `POST` - Verify/reject provider profile (admin only)
   - Updates trust score when verified
   - Resets verification status when profile is updated

4. **Admin Profile API** (`/api/profiles/admin`)
   - `GET` - Get admin profile for authenticated user
   - `PUT` - Create or update admin profile
   - Fields: department, permissions (JSON array)

5. **Security**
   - Role-based access control
   - Only users can access/update their own profiles
   - Admin-only provider verification
   - Input sanitization
   - Audit logging

### Frontend

1. **API Client** (`src/lib/api.ts`)
   - `profileApi.customer.get()` - Get customer profile
   - `profileApi.customer.update()` - Update customer profile
   - `profileApi.provider.get()` - Get provider profile
   - `profileApi.provider.update()` - Update provider profile
   - `profileApi.provider.verify()` - Verify provider (admin)
   - `profileApi.admin.get()` - Get admin profile
   - `profileApi.admin.update()` - Update admin profile

## 📋 Profile Flow

### Customer Profile
1. Customer signs up → User created
2. Customer updates profile → CustomerProfile created/updated
3. Profile used for booking defaults

### Provider Profile
1. Provider signs up → User + ServiceProvider created
2. Provider updates profile → ProviderProfile created/updated
3. Verification status set to "pending"
4. Admin verifies → Status: "verified", trust score updated
5. Profile updated → Verification reset to "pending"

### Admin Profile
1. Admin account created → User created
2. Admin updates profile → AdminProfile created/updated
3. Permissions stored as JSON array

## 🔄 Trust Score Integration

When provider profile is verified:
- Trust score automatically recalculated
- Verification level updated (0-3 scale)
- Affects 5% of total trust score

## 📝 API Usage Examples

### Customer Profile
```typescript
// Get profile
const profile = await profileApi.customer.get();

// Update profile
await profileApi.customer.update({
  address: '123 Main St',
  city: 'Johannesburg',
  postalCode: '2000',
  preferredContactMethod: 'email'
});
```

### Provider Profile
```typescript
// Get profile
const profile = await profileApi.provider.get();

// Update profile
await profileApi.provider.update({
  bankName: 'Standard Bank',
  bankAccountNumber: '1234567890',
  bankAccountType: 'cheque',
  idNumber: '1234567890123',
  taxNumber: '987654321',
  businessRegistration: 'CK123456'
});

// Verify provider (admin)
await profileApi.provider.verify(providerId, 'verified', 'All documents verified');
```

### Admin Profile
```typescript
// Get profile
const profile = await profileApi.admin.get();

// Update profile
await profileApi.admin.update({
  department: 'Operations',
  permissions: ['manage_users', 'manage_payments', 'resolve_disputes']
});
```

## 🔒 Security

- **Role Isolation**: Each role has separate profile model
- **Access Control**: Users can only access/update their own profiles
- **Verification**: Only admins can verify provider profiles
- **Audit Logging**: All profile updates are logged
- **Data Sanitization**: All inputs are sanitized

## 🎨 Next Steps (UI Integration)

1. **Profile Pages**: Create profile management pages for each role
2. **Provider Verification**: Admin interface to verify providers
3. **Profile Forms**: Update profile forms to use new API
4. **Default Values**: Use profile data as defaults in booking forms

## 📊 Benefits

1. **Role Isolation**: Separate data models prevent data leakage
2. **Verification**: Provider verification affects trust scores
3. **Extensibility**: Easy to add new fields per role
4. **Security**: Role-based access ensures data privacy

