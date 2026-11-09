const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function runEndToEndVerification() {
  const baseUrl = 'http://localhost:5000/api';
  const timestamp = Date.now();
  const testEmail = `persistence_verify_${timestamp}@vigorfit.test`;
  const testPassword = 'TestP@ssword123';
  const testName = `Persistence Verify User ${timestamp}`;

  console.log('====================================================');
  console.log('   VIGORFIT REAL API DATA PERSISTENCE VERIFICATION   ');
  console.log('====================================================');
  console.log('Target API Host:', baseUrl);
  console.log('Target DB:', 'vfit');
  console.log('Test Account:', testEmail);

  // 1. REGISTER
  console.log('\n[1/12] Registering user via POST /api/auth/register...');
  const regRes = await fetch(baseUrl + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201) {
    throw new Error(`Registration failed (HTTP ${regRes.status}): ${JSON.stringify(regData)}`);
  }
  const token = regData.token;
  const userId = regData.user.id;
  console.log('  ✅ Registered successfully. User ID:', userId);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
  };

  // 2. LOGIN
  console.log('\n[2/12] Logging in via POST /api/auth/login...');
  const loginRes = await fetch(baseUrl + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log('  ✅ Login verified. Token received.');

  // 3. GET & UPDATE PROFILE
  console.log('\n[3/12] Testing profile retrieval and update via /api/auth/profile...');
  const profRes = await fetch(baseUrl + '/auth/profile', { headers: authHeaders });
  const profData = await profRes.json();
  if (profRes.status !== 200) {
    throw new Error(`Profile fetch failed: ${JSON.stringify(profData)}`);
  }

  const updateProfRes = await fetch(baseUrl + '/auth/profile', {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      bio: 'Persistence test athlete profile',
      height: 182,
      weight: 76,
      fitnessGoal: 'Muscle Hypertrophy & Strength',
    }),
  });
  const updateProfData = await updateProfRes.json();
  if (updateProfRes.status !== 200) {
    throw new Error(`Profile update failed: ${JSON.stringify(updateProfData)}`);
  }
  console.log('  ✅ Profile updated in DB:', updateProfData.user.name, '| Goal:', updateProfData.user.fitnessGoal);

  // 4. CREATE WORKOUT
  console.log('\n[4/12] Creating workout record via POST /api/workouts...');
  const workoutRes = await fetch(baseUrl + '/workouts', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Verification Chest & Shoulders ' + timestamp,
      category: 'Strength',
      description: 'End-to-end verification workout session',
      tags: ['Chest', 'Shoulders', 'Verification'],
      exercises: [
        { name: 'Barbell Bench Press', sets: 4, reps: 10, weight: 75, notes: 'Clean form' },
        { name: 'Overhead Shoulder Press', sets: 3, reps: 12, weight: 40, notes: 'Strict press' },
      ],
    }),
  });
  const workoutData = await workoutRes.json();
  if (workoutRes.status !== 201) {
    throw new Error(`Workout creation failed: ${JSON.stringify(workoutData)}`);
  }
  const workoutId = workoutData.workout._id;
  console.log('  ✅ Workout created in collection "workouts":', workoutId, '| Title:', workoutData.workout.title);

  // 5. CREATE NUTRITION
  console.log('\n[5/12] Logging nutrition record via POST /api/nutrition...');
  const nutRes = await fetch(baseUrl + '/nutrition', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      mealType: 'breakfast',
      foodName: 'Oats with Greek Yogurt & Whey Protein',
      quantity: '1 large bowl',
      calories: 520,
      protein: 42,
      carbs: 65,
      fat: 10,
      notes: 'High-protein breakfast',
    }),
  });
  const nutData = await nutRes.json();
  if (nutRes.status !== 201) {
    throw new Error(`Nutrition creation failed: ${JSON.stringify(nutData)}`);
  }
  const nutritionId = nutData.nutrition._id;
  console.log('  ✅ Nutrition created in collection "nutritions":', nutritionId, '| Food:', nutData.nutrition.foodName);

  // 6. CREATE PROGRESS
  console.log('\n[6/12] Logging body progress record via POST /api/progress...');
  const progRes = await fetch(baseUrl + '/progress', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      weight: 75.8,
      chest: 105,
      waist: 82,
      hips: 97,
      biceps: 38,
      benchPressMax: 100,
      squatMax: 130,
      deadliftMax: 160,
      notes: 'Monthly assessment verification',
    }),
  });
  const progData = await progRes.json();
  if (progRes.status !== 201) {
    throw new Error(`Progress creation failed: ${JSON.stringify(progData)}`);
  }
  const progressId = progData.progress._id;
  console.log('  ✅ Progress created in collection "progresses":', progressId, '| Weight:', progData.progress.weight);

  // 7. CREATE VIGORFIT PRIMARY RECORD (vigorfit_e collection)
  console.log('\n[7/12] Logging primary entry via POST /api/vigorfit-entries (collection "vigorfit_e")...');
  const vfRes = await fetch(baseUrl + '/vigorfit-entries', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'HIIT Sprints & Core Circuit ' + timestamp,
      category: 'HIIT',
      durationMinutes: 30,
      caloriesBurned: 350,
      metricValue: 10,
      metricUnit: 'rounds',
      targetValue: 10,
      status: 'completed',
      intensity: 'high',
      notes: 'Sprint intervals and plank circuit',
    }),
  });
  const vfData = await vfRes.json();
  if (vfRes.status !== 201) {
    throw new Error(`VigorfitE creation failed: ${JSON.stringify(vfData)}`);
  }
  const vigorfitEntryId = vfData.entry._id;
  console.log('  ✅ Primary record created in collection "vigorfit_e":', vigorfitEntryId, '| Title:', vfData.entry.title);

  // 8. UPDATE SETTINGS
  console.log('\n[8/12] Updating settings via PUT /api/settings (collection "settings")...');
  const setRes = await fetch(baseUrl + '/settings', {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      theme: 'dark',
      dailyCalorieTarget: 2500,
      dailyStepGoal: 12000,
      dailyWaterGoal: 3200,
      dailyWorkoutGoal: 60,
      preferredUnit: 'metric',
    }),
  });
  const setData = await setRes.json();
  if (setRes.status !== 200) {
    throw new Error(`Settings update failed: ${JSON.stringify(setData)}`);
  }
  console.log('  ✅ Settings updated in collection "settings": Daily Calories Target:', setData.settings.dailyCalorieTarget);

  // 9. CREATE NOTIFICATION
  console.log('\n[9/12] Creating notification via POST /api/notifications (collection "notifications")...');
  const notifRes = await fetch(baseUrl + '/notifications', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Milestone: Verified 1st Workout Session!',
      message: 'Keep the momentum going strong this week!',
      type: 'achievement',
    }),
  });
  const notifData = await notifRes.json();
  if (notifRes.status !== 201) {
    throw new Error(`Notification creation failed: ${JSON.stringify(notifData)}`);
  }
  const notificationId = notifData.notification._id;
  console.log('  ✅ Notification created in collection "notifications":', notificationId);

  // 10. CREATE FEEDBACK
  console.log('\n[10/12] Submitting support ticket via POST /api/feedback (collection "feedbacks")...');
  const fbRes = await fetch(baseUrl + '/feedback', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      subject: 'Persistence Verification Inquiry ' + timestamp,
      category: 'feature',
      message: 'Testing persistence write to MongoDB Atlas feedbacks collection',
    }),
  });
  const fbData = await fbRes.json();
  if (fbRes.status !== 201) {
    throw new Error(`Feedback creation failed: ${JSON.stringify(fbData)}`);
  }
  const feedbackId = fbData.feedback._id;
  console.log('  ✅ Feedback created in collection "feedbacks":', feedbackId);

  // 11. UPLOAD TRANSFORMATION PHOTO
  console.log('\n[11/12] Uploading photo via POST /api/transformation-photos (collection "transformationphotos")...');
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const todayStr = new Date().toISOString().split('T')[0];

  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="date"\r\n\r\n${todayStr}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="notes"\r\n\r\nVerification progress photo\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="verify.png"\r\nContent-Type: image/png\r\n\r\n`),
    pngHeader,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const photoRes = await fetch(baseUrl + '/transformation-photos', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
    },
    body: bodyBuffer,
  });
  const photoData = await photoRes.json();
  if (photoRes.status !== 201) {
    throw new Error(`Photo upload failed: ${JSON.stringify(photoData)}`);
  }
  const photoId = photoData.photo.id;
  console.log('  ✅ Photo saved in collection "transformationphotos":', photoId);

  // 12. VERIFY COLLECTION COUNTS VIA LIVE DIAGNOSTIC ENDPOINT
  console.log('\n[12/12] Fetching live /api/health collection diagnostics...');
  const healthRes = await fetch('http://localhost:5000/api/health');
  const healthData = await healthRes.json();
  console.log('  📊 Live Collection Counts Reported by API Health Monitor:');
  console.table(healthData.collections);
  console.log('  Total active documents in Atlas:', healthData.totalDocuments);

  // DIRECT MONGODB ATLAS VERIFICATION
  console.log('\n----------------------------------------------------');
  console.log('  DIRECT DATABASE VERIFICATION IN ATLAS (DB: "vfit")');
  console.log('----------------------------------------------------');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'vfit', family: 4 });
  const db = mongoose.connection.db;

  const [
    userDoc,
    workoutDoc,
    nutDoc,
    progDoc,
    vfDoc,
    setDoc,
    notifDoc,
    fbDoc,
    photoDoc,
  ] = await Promise.all([
    db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) }),
    db.collection('workouts').findOne({ _id: new mongoose.Types.ObjectId(workoutId) }),
    db.collection('nutritions').findOne({ _id: new mongoose.Types.ObjectId(nutritionId) }),
    db.collection('progresses').findOne({ _id: new mongoose.Types.ObjectId(progressId) }),
    db.collection('vigorfit_e').findOne({ _id: new mongoose.Types.ObjectId(vigorfitEntryId) }),
    db.collection('settings').findOne({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('notifications').findOne({ _id: new mongoose.Types.ObjectId(notificationId) }),
    db.collection('feedbacks').findOne({ _id: new mongoose.Types.ObjectId(feedbackId) }),
    db.collection('transformationphotos').findOne({ _id: new mongoose.Types.ObjectId(photoId) }),
  ]);

  const verificationSummary = [
    { Collection: 'users', DocumentId: userDoc?._id.toString(), Verified: !!userDoc, Details: `Name: ${userDoc?.name}` },
    { Collection: 'workouts', DocumentId: workoutDoc?._id.toString(), Verified: !!workoutDoc, Details: `Title: ${workoutDoc?.title}` },
    { Collection: 'nutritions', DocumentId: nutDoc?._id.toString(), Verified: !!nutDoc, Details: `Food: ${nutDoc?.foodName}` },
    { Collection: 'progresses', DocumentId: progDoc?._id.toString(), Verified: !!progDoc, Details: `Weight: ${progDoc?.weight} kg` },
    { Collection: 'vigorfit_e', DocumentId: vfDoc?._id.toString(), Verified: !!vfDoc, Details: `Category: ${vfDoc?.category}, Cal: ${vfDoc?.caloriesBurned}` },
    { Collection: 'settings', DocumentId: setDoc?._id.toString(), Verified: !!setDoc, Details: `Target Cal: ${setDoc?.dailyCalorieTarget}` },
    { Collection: 'notifications', DocumentId: notifDoc?._id.toString(), Verified: !!notifDoc, Details: `Title: ${notifDoc?.title}` },
    { Collection: 'feedbacks', DocumentId: fbDoc?._id.toString(), Verified: !!fbDoc, Details: `Subject: ${fbDoc?.subject}` },
    { Collection: 'transformationphotos', DocumentId: photoDoc?._id.toString(), Verified: !!photoDoc, Details: `Size: ${photoDoc?.image?.length} bytes` },
  ];

  console.table(verificationSummary);

  const allVerified = verificationSummary.every((item) => item.Verified);
  if (!allVerified) {
    throw new Error('Not all documents were verified in MongoDB Atlas!');
  }

  // CLEANUP TEST DATA SAFELY
  console.log('\n----------------------------------------------------');
  console.log('  SAFE CLEANUP OF TEST RECORDS (User ID:', userId, ')');
  console.log('----------------------------------------------------');
  await Promise.all([
    db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(userId) }),
    db.collection('workouts').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('nutritions').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('progresses').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('vigorfit_e').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('settings').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('notifications').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('feedbacks').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
    db.collection('transformationphotos').deleteMany({ user: new mongoose.Types.ObjectId(userId) }),
  ]);
  console.log('  ✅ All test records created during this verification run were safely removed.');

  const postCounts = {};
  for (const item of verificationSummary) {
    postCounts[item.Collection] = await db.collection(item.Collection).countDocuments();
  }
  console.log('  Post-cleanup Atlas collection counts:', postCounts);

  await mongoose.disconnect();
  console.log('\n✨ ALL 9 COLLECTIONS VERIFIED PERSISTENT AND HEALTHY IN ATLAS! ✨\n');
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ VERIFICATION ERROR:', err.message);
  process.exit(1);
});
