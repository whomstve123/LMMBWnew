
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listFiles() {
  const bucket = 'stems';
  const folders = ['', 'pads/', 'bass/', 'noise/'];

  for (const folder of folders) {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    console.log(`Listing for "${folder || 'root'}":`, data, error);
  }
}

listFiles();
