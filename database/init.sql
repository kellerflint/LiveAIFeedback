CREATE DATABASE IF NOT EXISTS fb_tool;
USE fb_tool;

CREATE TABLE IF NOT EXISTS admin_user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS question (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text TEXT NOT NULL,
  grading_criteria TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS session (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  ai_model VARCHAR(255) DEFAULT 'openai/gpt-3.5-turbo',
  status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS session_question (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_response (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  session_question_id INT NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  response_text TEXT NOT NULL,
  ai_score INT,
  ai_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE,
  FOREIGN KEY (session_question_id) REFERENCES session_question(id) ON DELETE CASCADE
);

-- Basic admin seed
INSERT INTO admin_user (username, password_hash)
VALUES ('admin', '$2b$12$A//WYZ.2uhuZ9dM/VkvIeu6wCwt2l1tOtG4t0PryzniXGW72YC6/6');
