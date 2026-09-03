# Aurora - Tenant Management System

A comprehensive web-based tenant management system for rental apartment complexes, built with HTML, CSS, and JavaScript.

## Features

### 🏠 Tenant Management
- **Complete tenant records** with all required information
- **Contact details** (name, phone, email)
- **Rental information** (check-in/check-out dates, rent amount, deposit)
- **Booking source tracking** (online, in-person, phone, travel agent)
- **Special requests and remarks**
- **Status tracking** (active/inactive)

### 🔧 Maintenance Tracking
- **Maintenance request management**
- **Issue categorization** (plumbing, electrical, appliance, structural)
- **Priority levels** (low, medium, high, urgent)
- **Status tracking** (pending/completed)
- **Condition tracking** (pre/post departure)

### 📦 Inventory Management
- **Furniture tracking** by apartment
- **Appliances inventory**
- **Utensils management**
- **Item counts and notes**

### 📊 Dashboard
- **Real-time statistics**
- **Recent tenant activity**
- **Quick action buttons**
- **Revenue tracking**

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required

### Installation
1. Download or clone the project files
2. Open `index.html` in your web browser
3. The application will load with sample data for demonstration

### Usage

#### Adding a New Tenant
1. Click "Add New Tenant" from the dashboard or tenants page
2. Fill in the required information:
   - **Full Name** (required)
   - **Phone Number** (required)
   - **Email** (optional)
   - **Apartment Number** (required)
   - **Check-in Date** (required)
   - **Check-out Date** (optional)
   - **Rental Basis** (monthly/daily)
   - **Rent Amount** (required)
   - **Deposit Amount** (optional)
   - **Booking Source** (optional)
   - **Special Requests** (optional)
   - **Other Remarks** (optional)
3. Click "Add Tenant" to save

#### Managing Maintenance Requests
1. Navigate to the Maintenance page
2. Click "New Maintenance Request"
3. Fill in the details:
   - **Apartment Number** (required)
   - **Issue Type** (required)
   - **Description** (required)
   - **Priority** (optional)
   - **Report Date** (optional)
4. Submit the request
5. Mark requests as completed when resolved

#### Managing Inventory
1. Go to the Inventory page
2. Select the appropriate tab (Furniture, Appliances, Utensils)
3. Click "Add Item"
4. Enter the details:
   - **Apartment Number** (required)
   - **Category** (required)
   - **Item Type** (required)
   - **Count** (required)
   - **Notes** (optional)

#### Searching and Filtering
- Use the search bar to find tenants by name, apartment number, or phone
- Filter tenants by status (active/inactive)
- All data is automatically saved to your browser's local storage

## Data Storage

The application uses **localStorage** to persist data in your browser. This means:
- Your data is saved locally on your device
- No internet connection required after initial load
- Data persists between browser sessions
- Data is private to your device

## Sample Data

The application comes with sample data to demonstrate functionality:
- **2 sample tenants** with complete information
- **1 sample maintenance request**
- **2 sample inventory items**

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## File Structure

```
Aurora/
├── index.html              # Main application file
├── styles/
│   ├── main.css           # Main stylesheet
│   └── animations.css     # Animation styles
├── js/
│   ├── main.js            # Main functionality
│   └── animations.js      # Enhanced animations
└── README.md              # This file
```

## Key Features

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Mobile-friendly navigation
- Adaptive layouts

### Micro Animations
- Smooth page transitions
- Hover effects on cards and buttons
- Loading animations
- Form validation feedback

### User Experience
- Intuitive navigation
- Clear visual hierarchy
- Consistent design language
- Accessibility features

## Customization

### Colors
The application uses a purple gradient theme. You can customize colors by editing:
- Primary colors in `styles/main.css`
- Gradient backgrounds
- Button colors

### Adding Features
The modular JavaScript structure makes it easy to add new features:
- Add new form handlers in `js/main.js`
- Create new pages by following the existing pattern
- Extend the data model as needed

## Troubleshooting

### Data Not Saving
- Ensure your browser supports localStorage
- Check if you're in private/incognito mode
- Clear browser cache and try again

### Animations Not Working
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

### Mobile Issues
- Ensure you're using a modern mobile browser
- Check if the viewport meta tag is present
- Test on different screen sizes

## Future Enhancements

Potential features for future versions:
- **Backend integration** with Node.js and MongoDB
- **User authentication**
- **Data export/import**
- **Advanced reporting**
- **Email notifications**
- **Payment tracking**
- **Photo uploads**
- **Calendar integration**

## Support

For issues or questions:
1. Check the browser console for error messages
2. Ensure all files are in the correct directory structure
3. Try clearing browser cache and localStorage
4. Test in a different browser

## License

This project is open source and available under the MIT License.

---

**Aurora Tenant Management System** - Making property management simple and efficient.

