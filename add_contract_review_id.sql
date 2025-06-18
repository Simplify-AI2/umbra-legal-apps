-- Add contract_review_id field to master_contract table
ALTER TABLE master_contract 
ADD COLUMN IF NOT EXISTS contract_review_id VARCHAR(50);

-- Add revised_contract_text field to master_contract table
ALTER TABLE master_contract 
ADD COLUMN IF NOT EXISTS revised_contract_text TEXT;

-- Create index for contract_review_id in master_contract table
CREATE INDEX IF NOT EXISTS idx_master_contract_review_id ON master_contract(contract_review_id);

-- Add contract_review_id field to contract_updates table (if it exists)
-- Note: This assumes the contract_updates table already exists
-- If it doesn't exist, you'll need to create it first

-- Add contract_review_id field to contract_updates table
ALTER TABLE contract_updates 
ADD COLUMN IF NOT EXISTS contract_review_id VARCHAR(50);

-- Create index for contract_review_id in contract_updates table
CREATE INDEX IF NOT EXISTS idx_contract_updates_review_id ON contract_updates(contract_review_id);

-- Create contract_updates table if it doesn't exist
CREATE TABLE IF NOT EXISTS contract_updates (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(100),
  session_token TEXT,
  original_pdf_text TEXT,
  contractual_reference TEXT,
  recommended_legal_amendment TEXT,
  original_clause TEXT,
  input_verification_of_amendments TEXT,
  contract_name VARCHAR(255),
  contract_review_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contract_updates table
CREATE INDEX IF NOT EXISTS idx_contract_updates_user_email ON contract_updates(user_email);
CREATE INDEX IF NOT EXISTS idx_contract_updates_created_at ON contract_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_contract_updates_review_id ON contract_updates(contract_review_id);

-- Enable Row Level Security (RLS) for contract_updates table
ALTER TABLE contract_updates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own contract updates
CREATE POLICY "Users can view own contract updates" ON contract_updates
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Create policy to allow users to insert their own contract updates
CREATE POLICY "Users can insert own contract updates" ON contract_updates
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Create policy to allow users to update their own contract updates
CREATE POLICY "Users can update own contract updates" ON contract_updates
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email); 