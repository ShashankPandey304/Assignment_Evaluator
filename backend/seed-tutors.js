const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

// ========================================
// ADD YOUR TUTOR ACCOUNTS HERE
// ========================================
const tutors = [
  {
    name: 'Prof. Shashank Pandey',
    email: 'tutor@eduflow.com',
    password: 'tutor1234',
    role: 'tutor',
  },
  // Add more tutors below:
  // {
  //   name: 'Prof. Jane Doe',
  //   email: 'jane@university.edu',
  //   password: 'securepassword',
  //   role: 'tutor',
  // },
];

async function seedTutors() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const tutor of tutors) {
      const existing = await User.findOne({ email: tutor.email });
      if (existing) {
        console.log(`⏭️  Tutor "${tutor.name}" (${tutor.email}) already exists — skipped`);
      } else {
        const user = new User(tutor);
        await user.save();
        console.log(`✅ Created tutor: ${tutor.name} (${tutor.email})`);
      }
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding tutors:', err.message);
    process.exit(1);
  }
}

seedTutors();
