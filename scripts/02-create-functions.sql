-- Function to generate user code
CREATE OR REPLACE FUNCTION generate_user_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate UDG + 7 random digits
    code := 'UDG' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE user_code = code) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, user_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    generate_user_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update user status
CREATE OR REPLACE FUNCTION update_user_status(new_status TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET status = new_status, updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM conversations
  WHERE (participant1_id = current_user_id AND participant2_id = other_user_id)
     OR (participant1_id = other_user_id AND participant2_id = current_user_id);
  
  -- If no conversation exists, create one
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (participant1_id, participant2_id)
    VALUES (current_user_id, other_user_id)
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired messages
CREATE OR REPLACE FUNCTION clean_expired_messages()
RETURNS VOID AS $$
BEGIN
  -- Delete expired messages and their files
  DELETE FROM messages 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(conv_id UUID, is_typing_now BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO typing_status (conversation_id, user_id, is_typing, updated_at)
  VALUES (conv_id, auth.uid(), is_typing_now, NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET is_typing = is_typing_now, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
