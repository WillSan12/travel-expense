# Team Travel Budget

A web-based travel expense reporting and budget tracking tool for the Apple Retail PD2 Payments team.

---

## Built With

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=flat&logo=visualstudiocode&logoColor=white)

---

## Prerequisites

Before getting started, make sure you have the following installed:

- [Node.js](https://nodejs.org) — download the **LTS** version (v18 or higher required)
- [Git](https://git-scm.com/downloads)

To verify Node.js is installed, run:
```
node -v
```
You should see `v18.x.x` or higher.

---

## Setup Instructions

> **Start here if this is your first time running the app.**

**Step 1 — Clone the repo**
```
git clone https://github.com/WillSan12/travel-expense.git
```

**Step 2 — Navigate to the app folder**
```
cd travel-expense/team-travel-budget
```

**Step 3 — Install dependencies**
```
npm install
```

**Step 4 — Start the server**
```
node server.js
```

**Step 5 — Open in your browser**

Go to: `http://localhost:3000`

**Login credentials:**
- Username: `admin`
- Password: `changeme`

---

## Running the App After Initial Setup

Once the repo is cloned and dependencies are installed, just run these two commands each time:

```
cd travel-expense/team-travel-budget
node server.js
```

Then open `http://localhost:3000` in your browser.

To stop the server press `Ctrl + C` in the terminal.

---

## Getting the Latest Updates

If someone else has pushed changes and you want to sync your local copy:

```
cd travel-expense
git pull origin main
```

Then restart the server.

---

## Features

- **Budget Entry** — add and track travel requests by traveler, manager, and IS&T unit
- **Dashboard** — visual summary of planned vs. approved vs. actualized spend with hover tooltips
- **Actualize** — record actual spend per trip (airfare, hotel, taxi, food, misc)
- **Year Comparison** — compare spending across fiscal years
- **Rate Guide** — airfare, hotel, and food rate references by region
- **Data Manager** — import/export, audit log, and master data management

---

## Notes

- Data is saved automatically to the server — no manual save needed
- All budget data is stored in `data/travel_budget.json` and is synced via Git
- Actualize-status trips remain visible on Budget Entry for accounting purposes
