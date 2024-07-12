const express = require('express');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const cors = require('cors');
const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();

const getISTTime = () => {
  const date = new Date();
  // Get the time in milliseconds and add IST offset (5.5 hours)
  const istTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istTime;
};

// Validation and sanitization middleware
const referralValidation = [
  body('referrerName').trim().notEmpty().withMessage('Referrer name is required.'),
  body('referrerEmail').isEmail().withMessage('Invalid referrer email.'),
  body('refereeName').trim().notEmpty().withMessage('Referee name is required.'),
  body('refereeEmail').isEmail().withMessage('Invalid referee email.'),
];

app.get('/getAll', (req, res, next) => {
  console.log("its console.. ", process.env.EMAIL);
  res.send("Its a get end point---");
});

 
// Endpoint to save referral data
app.post('/refer', referralValidation, async (req, res, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { referrerName, referrerEmail, refereeName, refereeEmail } = req.body;

  try {
    // Save referral data to the database
    const referral = await prisma.referral.create({
      data: { referrerName, referrerEmail, refereeName, refereeEmail, createdAt: getISTTime() },
    });
    console.log(referral);
    // Send referral email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: refereeEmail,
      subject: 'You have been referred to a course!',
      text: `Hi ${refereeName},\n\n${referrerName} has referred you to a great course!\n\nBest regards,\nCourse xyz Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send referral email.' });
      }
      console.log('Email sent:', info.response);
      res.status(201).json(referral);
    });
  } catch (error) {
    console.error('Error saving referral:', error);
    next(error);
  }
});

//Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server errorr.' });
});

// Start the server
const PORT = process.env.PORT||3005;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
