# 💊 Medication Checker

A comprehensive tool designed to enhance **medication safety, adherence, and patient education** using a robust backend API and an intuitive frontend interface. This system integrates advanced drug interaction checks, patient-friendly information, and personalized tips, leveraging the Gemini API for AI-driven insights.

> 🚀 Developed to empower patients and healthcare providers with transparent, actionable medication management solutions.

---

## 📸 Project Preview

![Screenshot 2025-07-08 213220](https://github.com/user-attachments/assets/1ae0899e-1703-4d6e-9157-120dad443443)
![Screenshot 2025-07-08 213241](https://github.com/user-attachments/assets/3898782e-0465-4dbf-8915-72ecab458c4c)
## Drug Interaction checker
![Screenshot 2025-07-08 205939](https://github.com/user-attachments/assets/560a081d-be03-455f-af2f-043c734ba3ce)
## Drug Sideeffects
![Screenshot 2025-07-08 213155](https://github.com/user-attachments/assets/28afcb64-6600-4feb-bd7a-6f8780fa00de)
## Drugs Information
![Screenshot 2025-07-08 213134](https://github.com/user-attachments/assets/973c887b-d709-48b0-b3ef-27c8d4432799)
## Food Interactions
![Screenshot 2025-07-08 213022](https://github.com/user-attachments/assets/59e232db-2005-4a55-8684-207c554b841a)





---

## 🔑 Key Features

- **Drug Standardization**: Normalizes medication names using RxNorm for accurate processing.
- **Interaction Checking**: Identifies potential drug interactions with detailed severity assessments.
- **Patient-Friendly Info**: Provides simple drug descriptions, side effects, and food interaction guidance.

---

## 🌍 Real-World Impact

By using the **Medication Checker**, patients can:

- Understand drug interactions and severity to avoid adverse effects ⚠️ 
- Access clear, jargon-free information to manage their health confidently 🌟  

This promotes better health outcomes and empowers users to make informed decisions about their medications.

---

## 💻 Tech Stack

- **Backend**: Flask, Python
- **Frontend**: React.js, TypeScript
- **API Integration**: Gemini API for AI-driven content
- **Database**: SQLite (for cache databases like rxnorm_cache.db)
- **Styling**: Tailwind CSS
- **Development Tools**: Vite, ESLint, Prettier

---

## ⚙️ .env Variables

```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

---

## 🚀 Project Setup



#### Frontend (in `frontend` folder)
```bash
npm install
```

### Start Backend
```bash
# Navigate to Backend folder
cd Backend
python app.py
```

### Start Frontend
```bash
# Navigate to frontend folder
cd frontend
npm run dev
```

- The frontend will be available at `http://localhost:5173` (default Vite port).
- The backend API will run at `http://localhost:5000`.



---
