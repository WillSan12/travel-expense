# Team Travel Budget

A web-based travel expense reporting and budget tracking tool for the Retail PD2 Payments team.

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

- [Node.js](https://nodejs.org) — download the **LTS** version
- [Git](https://git-scm.com/downloads)

#### START HERE ###

## Setup Instructions ##

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

Once the repo is cloned and dependencies are installed, just run the following each time:

```
cd travel-expense/team-travel-budget
node server.js
```

Then open `http://localhost:3000` in your browser.

---

## Features

- Budget Entry — add and track travel requests by traveler, manager, and IS&T unit
- Dashboard — visual summary of planned vs. actual spend
- Year Comparison — compare spending across fiscal years
- Rate Guide — airfare, hotel, and food rate references by region
- Data Manager — import/export, audit log, and master data management

---

## Notes

- Data is saved automatically to the server — no manual save needed
- To stop the server press `Ctrl + C` in the terminal
