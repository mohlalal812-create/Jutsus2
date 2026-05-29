const express = require('express');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: 'https://just-you-n-i-default-rtdb.firebaseio.com'
});

const db = admin.database();

db.ref('chats').on('child_changed', async snapshot => {
  const chatData = snapshot.val();
  if (!chatData || !chatData.lastMessage) return;
  const { sender, text } = chatData.lastMessage;
  const chatId = snapshot.key;
  const uids = chatId.split('_');
  const recipientUid = uids.find(uid => uid !== sender);
  if (!recipientUid) return;
  const tokenSnap = await db.ref('users/' + recipientUid + '/fcmToken').once('value');
  const token = tokenSnap.val();
  if (!token) return;
  const nameSnap = await db.ref('users/' + sender + '/name').once('value');
  const senderName = nameSnap.val() || 'Someone';
  await admin.messaging().send({
    token,
    notification: { title: senderName, body: text },
    webpush: { fcmOptions: { link: 'https://justus14-newapp.netlify.app' } }
  });
});

app.get('/', (req, res) => res.send('JUSTUS notify server running'));
app.listen(3000, () => console.log('Server running on port 3000'));