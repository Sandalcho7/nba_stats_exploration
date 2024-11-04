import numpy as np


def process_input(data, feature_names):
    features = np.zeros(len(feature_names))
    
    for i, feature in enumerate(feature_names):
        if feature.startswith('pos_') and 'pos' in data:
            features[i] = 1 if feature == f"pos_{data['pos']}" else 0
        elif feature.startswith('tm_') and 'tm' in data:
            features[i] = 1 if feature == f"tm_{data['tm']}" else 0
        elif feature == 'lg_NBA':
            features[i] = 1
        elif '_prev' in feature:
            stat, season = feature.split('_prev')
            if stat in data and 'prev_seasons' in data:
                season_index = int(season) - 1
                if season_index < len(data['prev_seasons']):
                    features[i] = data['prev_seasons'][season_index].get(stat, 0)
        elif feature in data:
            features[i] = data[feature]
    
    return features


def remove_dots(name):
    return name.replace('.', '')