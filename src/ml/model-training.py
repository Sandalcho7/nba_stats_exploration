#!/usr/bin/env python
# coding: utf-8

# # NBA Stats | Model training

# ## Data preparation

# In[ ]:


import pandas as pd
from sqlalchemy import create_engine

# Connect to your PostgreSQL database
engine = create_engine('postgresql://postgres:postgres@localhost:5432/nba_stats')

# Load the data into a pandas DataFrame
query = "SELECT * FROM player_totals"
df = pd.read_sql(query, engine)

# Display the first few rows and basic information about the dataset
print(df.head())
print(df.info())


# ## Data preprocessing

# In[ ]:


# Check for missing values
print(df.isnull().sum())

# Handle missing values
df = df.dropna()  # or use df.fillna() to impute missing values

print("Shape after handling missing values:", df.shape)


# In[ ]:


# Identify categorical columns that haven't been encoded yet
categorical_columns = df.select_dtypes(include=['object']).columns
print("Categorical columns:", categorical_columns)

# Identify numerical columns
numerical_columns = df.select_dtypes(include=['int64', 'float64']).columns
print("Numerical columns:", numerical_columns)


# In[ ]:


# Drop the 'player' column
df = df.drop('player', axis=1)

# Convert remaining categorical variables to numerical
categorical_columns = df.select_dtypes(include=['object']).columns
df = pd.get_dummies(df, columns=categorical_columns)

# Identify numerical columns again after encoding
numerical_columns = df.select_dtypes(include=['int64', 'float64']).columns

print("Columns after encoding:", df.columns)


# In[ ]:


# Sort the DataFrame by player_id and season
df = df.sort_values(['player_id', 'season'])

# List of stats to create previous season versions
stats_to_shift = ['fg_percent', 'x3p_percent', 'x2p_percent', 'e_fg_percent', 'ft_percent', 'pts', 'trb', 'ast']

# Create previous season's statistics
for stat in stats_to_shift:
    df[f'{stat}_prev'] = df.groupby('player_id')[stat].shift(1)

print("Columns after creating previous season stats:", df.columns)


# ## Model training

# ### Setting label(s) and features

# In[ ]:


# Define your target variable
target = 'fg_percent'

# Select features (use only previous season stats and non-game specific data)
features = ['player_id', 'age', 'experience', 'birth_year'] + \
           [col for col in df.columns if col.endswith('_prev')] + \
           [col for col in df.columns if col.startswith('pos_') or col.startswith('tm_') or col.startswith('lg_')]

# Create feature matrix X and target vector y
X = df[features]
y = df[target]

# Handle missing values
X = X.dropna()
y = y[X.index]

print("Final features:", X.columns)
print("Shape of feature matrix X:", X.shape)


# ### Splitting the data

# In[ ]:


from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training set shape:", X_train.shape)
print("Testing set shape:", X_test.shape)


# ### Training the model

# In[ ]:


# Initialize and train the model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Make predictions on the test set
y_pred = model.predict(X_test)

# Evaluate the model
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Mean Squared Error: {mse}")
print(f"R-squared Score: {r2}")


# ### Analyzing and visualizing

# In[ ]:


# Feature Importance
feature_importance = pd.DataFrame({'feature': features, 'importance': model.feature_importances_})
feature_importance = feature_importance.sort_values('importance', ascending=False)

print("\nTop 10 Most Important Features:")
print(feature_importance.head(10))


# In[ ]:


import matplotlib.pyplot as plt
import seaborn as sns

# Actual vs Predicted plot
plt.figure(figsize=(10, 6))
plt.scatter(y_test, y_pred, alpha=0.5)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
plt.xlabel('Actual')
plt.ylabel('Predicted')
plt.title('Actual vs Predicted Field Goal Percentage')
plt.show()

# Feature Importance plot
plt.figure(figsize=(12, 6))
sns.barplot(x='importance', y='feature', data=feature_importance.head(20))
plt.title('Top 20 Feature Importances')
plt.show()


# ### Saving model

# In[ ]:


# Save the model
import joblib

models_directory = 'models'
model_name = 'fg_percentage_model'

joblib.dump((model, X.columns), f'{models_directory}/{model_name}.joblib')

print(f"Model saved as '{model_name}.joblib'")

