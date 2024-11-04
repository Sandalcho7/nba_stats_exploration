# NBA Stats Exploration

## Description
A simple dashboard allowing the user to communicate with a database storing players and teams statistics during the 2023/2024 NBA season.

## Project structure
```bash
project/
│
├── alertmanager/               # Alert Manager config
│   └── config.yml
│
├── database/                   # Database files
│   └── tables-creation.sql     # Tables creation requests examples
│
├── grafana/                    # Grafana config
│   └── provisioning/
│       └── datasources/
│           └── datasources.yaml
│
├── prometheus/                 # Prometheus config
│   ├── alert.rules
│   └── prometheus.yml
│
├── src/
│   ├── api/
│   │   ├── balldontlie-api.js  # Ball Don't Lie API functions
│   │   └── postgres-api.js     # Postgres API functions
│   │
│   ├── utils/
│   │   ├── scraping.js         # Scraping functions
│   │   └── sql-generation.js   # SQL requests generation functions
│   │
│   └── server.js               # API script
│
├── .dockerignore
├── .env                        # Git ignored
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile.api              # API server image
├── package-lock.json
├── package.json
└── README.md
```