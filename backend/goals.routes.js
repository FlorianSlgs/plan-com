const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '/uploads/goals_images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

module.exports = (pool) => {
  router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        const filePath = req.file ? req.file.filename : null;
        const { userId, campaignName, title, description, subgoals } = req.body;
        if (!filePath || !userId || !campaignName || !title) {
        return res.status(400).json({ message: 'Champs requis manquants.' });
        }

        // Récupère l'id de la campagne à partir de son nom
        const campaignResult = await pool.query(
        'SELECT id FROM campaign WHERE name = $1 AND user_id = $2 LIMIT 1',
        [campaignName, userId]
        );
        if (campaignResult.rows.length === 0) {
        return res.status(404).json({ message: 'Campagne non trouvée.' });
        }
        const campaignId = campaignResult.rows[0].id;

        await pool.query(
        `INSERT INTO goals (user_id, currentCampaign, goals_name, goals_description, subgoals, goals_imageurl)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, campaignId, title, description, subgoals, filePath]
        );

        res.status(201).json({ message: 'Objectif enregistré.', filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
    });

  router.get('/user/:userId/campaign/:campaignName', async (req, res) => {
    const { userId, campaignName } = req.params;
    try {
        // Récupère l'id de la campagne à partir de son nom et du userId
        const campaignResult = await pool.query(
        'SELECT id FROM campaign WHERE name = $1 AND user_id = $2 LIMIT 1',
        [campaignName, userId]
        );
        if (campaignResult.rows.length === 0) {
        return res.json([]); // Pas de campagne trouvée
        }
        const campaignId = campaignResult.rows[0].id;

        // Récupère les goals pour ce user ET cette campagne
        const result = await pool.query(
        `SELECT id, goals_name, goals_description, subgoals, goals_imageurl
        FROM goals WHERE user_id = $1 AND currentCampaign = $2`,
        [userId, campaignId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
    });

    router.put('/update/:goalId', upload.single('image'), async (req, res) => {
      try {
        const { goalId } = req.params;
        const { title, description, subgoals } = req.body;
        let imageUrl = null;

        if (req.file) {
          imageUrl = req.file.filename;
        }

        // Mets à jour les champs
        const updateFields = [];
        const values = [];
        let idx = 1;

        if (title) { updateFields.push(`goals_name = $${idx++}`); values.push(title); }
        if (description) { updateFields.push(`goals_description = $${idx++}`); values.push(description); }
        if (subgoals) { updateFields.push(`subgoals = $${idx++}`); values.push(subgoals); }
        if (imageUrl) { updateFields.push(`goals_imageurl = $${idx++}`); values.push(imageUrl); }

        if (updateFields.length === 0) {
          return res.status(400).json({ message: 'Aucun champ à mettre à jour.' });
        }

        values.push(goalId);

        await pool.query(
          `UPDATE goals SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
          values
        );

        res.json({ message: 'Objectif mis à jour.' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur.' });
      }
    });

  return router;
};