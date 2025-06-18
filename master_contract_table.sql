-- Create master_contract table
CREATE TABLE IF NOT EXISTS master_contract (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(100),
  session_token TEXT,
  original_pdf_text TEXT,
  revised_contract_text TEXT,
  contract_name VARCHAR(255),
  contract_review_id VARCHAR(50),
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_master_contract_user_email ON master_contract(user_email);
CREATE INDEX IF NOT EXISTS idx_master_contract_created_at ON master_contract(created_at);
CREATE INDEX IF NOT EXISTS idx_master_contract_review_id ON master_contract(contract_review_id);

-- Enable Row Level Security (RLS)
ALTER TABLE master_contract ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own contracts
CREATE POLICY "Users can view own contracts" ON master_contract
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Create policy to allow users to insert their own contracts
CREATE POLICY "Users can insert own contracts" ON master_contract
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Create policy to allow users to update their own contracts
CREATE POLICY "Users can update own contracts" ON master_contract
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email); 