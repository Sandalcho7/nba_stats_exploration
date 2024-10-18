# NBA Stats Exploration

## Description
A simple dashboard allowing the user to communicate with a database storing players and teams statistics during the 2023/2024 NBA season.

## Project structure
```bash
project/
│
├── alertmanager/       # Alert Manager config
│   └── config.yml
│
├── grafana/            # Grafana config
│   └── provisioning/
│       └── datasources/
│           └── datasources.yaml
│
├── prometheus/         # Prometheus config
│   ├── alert.rules
│   └── prometheus.yml
│
├── src/
│   ├── utils/          # Utilities functions
│   └── server.js       # API script
│
├── .dockerignore
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile.api      # API server image
├── package-lock.json
├── package.json
└── README.md
```