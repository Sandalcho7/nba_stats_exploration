CREATE TABLE IF NOT EXISTS player_totals
(
    seas_id INTEGER,
    season INTEGER,
    player_id INTEGER,
    player TEXT,
    birth_year TEXT,
    pos TEXT,
    age INTEGER,
    experience INTEGER,
    lg TEXT,
    tm TEXT,
    g INTEGER,
    gs INTEGER,
    mp INTEGER,
    fg INTEGER,
    fga INTEGER,
    fg_percent DOUBLE PRECISION,
    x3p INTEGER,
    x3pa INTEGER,
    x3p_percent DOUBLE PRECISION,
    x2p INTEGER,
    x2pa INTEGER,
    x2p_percent DOUBLE PRECISION,
    e_fg_percent DOUBLE PRECISION,
    ft INTEGER,
    fta INTEGER,
    ft_percent DOUBLE PRECISION,
    orb INTEGER,
    drb INTEGER,
    trb INTEGER,
    ast INTEGER,
    stl INTEGER,
    blk INTEGER,
    tov INTEGER,
    pf INTEGER,
    pts INTEGER
);


CREATE TABLE IF NOT EXISTS top_scorers
(
    player TEXT,
    ppg DOUBLE PRECISION
);