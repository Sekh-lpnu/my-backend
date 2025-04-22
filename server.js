const express = require('express');
const cors = require('cors');
const path = require('path');
const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();

// Налаштування CORS для дозволу запитів з інших доменів
app.use(cors());

// Обробка JSON запитів
app.use(express.json());

// Хостинг статичних файлів
app.use(express.static(path.join(__dirname, 'public')));

// Ініціалізація Firebase
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://your-database-name.firebaseio.com"  // замініть на ваш реальний URL Firebase
});

const db = firebaseAdmin.firestore();

// Маршрут для отримання середнього рейтингу ініціативи
app.get('/api/initiative/:id/ratings', async (req, res) => {
  const { id } = req.params;
  try {
    // Отримуємо всі оцінки для ініціативи з бази даних
    const snapshot = await db.collection('ratings').where('initiativeId', '==', id).get();
    if (snapshot.empty) {
      // Якщо оцінок немає, повертаємо середній рейтинг 0
      return res.status(404).json({ message: 'No ratings found', averageRating: 0 });
    }

    let totalRating = 0;
    let ratingCount = 0;

    // Проходимо через всі оцінки і обчислюємо середній рейтинг
    snapshot.forEach(doc => {
      totalRating += doc.data().rating;
      ratingCount++;
    });

    // Обчислюємо середній рейтинг з округленням до двох знаків
    const averageRating = (totalRating / ratingCount).toFixed(2);
    res.json({ averageRating });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ratings', error });
  }
});

// Маршрут для додавання нової оцінки для ініціативи
app.post('/api/initiative/:id/ratings', async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  // Перевірка, чи оцінка знаходиться в межах від 1 до 5
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    // Додаємо нову оцінку в базу даних
    await db.collection('ratings').add({
      initiativeId: id,
      rating: rating,
      timestamp: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    });

    // Після додавання оцінки отримуємо оновлений середній рейтинг
    const snapshot = await db.collection('ratings').where('initiativeId', '==', id).get();
    let totalRating = 0;
    let ratingCount = 0;

    snapshot.forEach(doc => {
      totalRating += doc.data().rating;
      ratingCount++;
    });

    const averageRating = (totalRating / ratingCount).toFixed(2);  // Округлюємо до двох знаків

    // Відправляємо повідомлення про успішне додавання оцінки та новий середній рейтинг
    res.status(201).json({ message: 'Rating added successfully', averageRating });
  } catch (error) {
    res.status(500).json({ message: 'Error adding rating', error });
  }
});

// Запуск сервера на порту 5000
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
