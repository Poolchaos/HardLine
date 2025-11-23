import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from 'dotenv';

config();

const HARDCODED_USER_ID = '000000000000000000000001';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hardline';

async function initUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findById(HARDCODED_USER_ID);
    if (existingUser) {
      console.log('✓ User already exists');
      console.log(JSON.stringify(existingUser, null, 2));
      await mongoose.disconnect();
      return;
    }

    // Create new user with default values
    const user = new User({
      _id: new mongoose.Types.ObjectId(HARDCODED_USER_ID),
      penaltySystemEnabled: true,
      payday: 25,
      sisterSubsidyCap: 0,
    });

    await user.save();
    console.log('✓ User created successfully');
    console.log(JSON.stringify(user, null, 2));

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

initUser();
