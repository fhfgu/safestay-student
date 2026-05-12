# SafeStay Student

## Project Description

SafeStay Student is a web-based accommodation platform designed to help university students find safe, affordable, and verified housing near their campuses. The system addresses the growing problem of accommodation scams by implementing a verification system for landlords and a reporting mechanism for suspicious listings.

## Objectives

- Provide a secure accommodation search interface with filtering options
- Enable students to save listings, leave reviews, and submit booking requests
- Implement a verified badge system for approved properties
- Allow landlords to manage their listings after identity verification
- Give administrators control over verifications and reported content
- Enforce business rules for bookings, reviews, and data integrity

## Key Features

**Student Features**
- Search and filter accommodation by price, distance, and room type
- View detailed property information including landlord details
- Save favorite listings to a personal collection
- Leave reviews with ratings for safety, cleanliness, Wi-Fi, and landlord behavior
- Report suspicious listings with reason and description
- Request bookings with start and end dates

**Landlord Features**
- Register and upload verification documents
- Add, edit, and delete property listings
- View booking requests for owned properties
- Track verification status

**Admin Features**
- Approve or reject landlord verifications
- Review reported listings and remove if necessary
- View system statistics including total listings and reports

## Technical Components

**Database Design**
The system uses nine entities: Student, Landlord, Admin, Accommodation, Booking, Review, Verification, Payment, and Report. Each entity has defined attributes with appropriate data types and sizes. Relationships include one-to-many between landlords and accommodations, students and bookings, and accommodations and reviews.

**User Interface**
The interface follows a card-based design with a blue and white color theme. Green badges indicate verified listings, and red buttons are used for scam reporting. The layout is responsive and works on both desktop and mobile devices.

**Business Rules**
Key rules include: students must log in to submit reviews, landlords must be verified before listing properties, and admins must approve all verifications. These rules are enforced through backend validation and database constraints.

## Technologies

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Database: SQLite

## Group Members

- Motheo Mbatha
- Inam Mbele
- Achuma Mbanga
- Mahmood Sonday
- Ntando Matiwane
- Musa Mbhalati

## Setup Instructions

1. Install dependencies: `npm install`
2. Start the server: `node server.js`
3. Access the application: `http://localhost:3000`

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@safestay.com | admin123 |
| Student | student@safestay.com | student123 |
| Landlord | landlord@safestay.com | landlord123 |
