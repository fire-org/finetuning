require('dotenv').config()

const OpenAI = require('openai');
const Handlebars = require("handlebars");
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const generateEntropy = require('./generateEntropy');

const openai = new OpenAI()

const promptTemplate = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'prompt.hbs'), 'utf8'));

function areRolesAlternating(messages) {
  // Check if the array is empty or has only one element
  if (messages.length <= 1) {
    return true;
  }

  for (let i = 1; i < messages.length; i++) {
    // Check if the current role is the same as the previous one
    if (messages[i].role === messages[i - 1].role) {
      return false;
    }
  }

  return true;
}

function objectToString(obj) {
  // Create an array to hold the key-value pairs
  const keyValuePairs = [];

  // Iterate over each key in the object
  for (const key in obj) {
      // Check if the key is actually a property of the object
      if (obj.hasOwnProperty(key)) {
          // Push the key-value pair into the array, formatted as 'key: value'
          keyValuePairs.push(`${key}: ${obj[key]}`);
      }
  }

  // Join the key-value pairs with a comma and space, and return the result
  return keyValuePairs.join('\n');
}

const nMessages = 50

async function complete() {
  const entropy = generateEntropy()
  const promptTemplateData = {
    depiction: objectToString(entropy.model),
    topic: entropy.topic,
    nMessages
  }

  const systemPrompt = promptTemplate(promptTemplateData)

  const rows = []

  while(rows.length < nMessages) {
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ]

    if(rows.length > 0) {
      messages.push({
        role: 'assistant',
        content: rows.join('\n')
      })

      messages.push({
        role: 'user',
        content: `Continue and start with ${rows[rows.length - 2].role}`
      })
    }

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: 'gpt-4',
      temperature: 1.0,
      top_p: 0.95,
      frequency_penalty: 0.03,
      presence_penalty: 0.10
    })
  
    const res = chatCompletion.choices[0].message.content
  
    let localRows = res.split('\n').map(a => a.trim()).filter(a => a)

    console.log('og_rows\n' + localRows.join('\n'))

    for(let i = 0; i < localRows.length; i++) {
      let row = localRows[i]
      try {
        row = JSON.parse(row)
      } catch {
        console.error(row)
        console.error('Invalid JSON ' + i)
        localRows = localRows.slice(0, i)
        break
      }

      if(!row.content || !row.role) {
        console.error('Invalid JSON ' + i)
        localRows = localRows.slice(0, i)
        break
      }

      // Transforms user to USER and girlfriend to GIRLFRIEND
      row.role = row.role.toUpperCase()

      // Removes ". ", "...", "!", etc on the beginning of the message
      row.content = row.content.replace(/^[^a-zA-Z\[]+/, '')

      // Remove *
      row.content = row.content.replace(/\*/g, '')
      row.content = row.content.replace(/\\n/g, '')

      // Replace these characters
      row.content = row.content.replace(/…+/g, '...')
      row.content = row.content.replace(/’/g, '\'')

      // remove whitespaces before ? and ! and . and ,
      row.content = row.content.replace(/\s+([.!?,]{1,})/g, '$1');

      // Replaces things like ,... or .!.. to ...
      row.content = row.content.replace(/([^a-zA-Z0-9\s\.\[\]])\./g, '.').replace(/\.([^a-zA-Z0-9\s\.\[\]])/g, '.')

      // Sometimes the AI doesn't add a whitespace after ... or .. or ! or ? or ,
      row.content = row.content.replace(/(\.{1,})(?!\s\.)/g, '$1 ')
      row.content = row.content.replace(/(!{1,})(?!\s!)/g, '$1 ')
      row.content = row.content.replace(/(\?{1,})(?!\s\?)/g, '$1 ')
      row.content = row.content.replace(/(,{1,})(?!\s,)/g, '$1 ')

      // Remove double whitespaces
      row.content = row.content.replace(/\s\s/g, ' ')

      // Capitalize after . ? !
      row.content = row.content.replace(/[\.!?] ([a-z])/g, function(match, letter) {
        return '. ' + letter.toUpperCase();
      });

      // Trim the message
      row.content = row.content.trim()

      // Capitalize first letter
      row.content[0] = row.content[0].toUpperCase()

      if(
        (row.role !== 'USER' && row.role !== 'GIRLFRIEND')
        || row.content.includes('{')
        || row.content.includes('}')
        || row.content.includes('(')
        || row.content.includes(')')
        || row.content.replace(/\[username\]/g, '').includes('[')
        || row.content.replace(/\[username\]/g, '').includes(']')
      ) {
        console.error('Invalid JSON custom ' + i)
        localRows = localRows.slice(0, i)
        break
      }

      localRows[i] = row
    }

    if(!areRolesAlternating([...rows, ...localRows])) {
      console.error('Roles are not alternating')
      continue
    }

    console.log('rows\n' + localRows.map(a => JSON.stringify(a)).join('\n'))

    rows.push(...localRows)
    console.log(`Valid JSON lines: ${localRows.length}/${rows.length}/${nMessages}`)  
  }

  return {
    systemPrompt,
    conversation: rows
  }
}

function openaiToShareGpt(obj) {
  return {
    id: obj.id,
    conversations: obj.messages.map(a => ({
      from: a.role,
      value: a.content
    }))
  }
}

async function main() {
  const uri = process.env.DATABASE_URL;
  client = new MongoClient(uri);
  
  await client.connect()
  database = client.db("admin");
  collection = database.collection("explicit");

  for(let i = 16; i < 30; i++) {
    const {systemPrompt, conversation} = await complete()
    

    await collection.insertOne({
      metadata: {
        systemPrompt
      },
      shareGpt: openaiToShareGpt({
        id: i + '',
        messages: conversation
      })
    })
  }

  await client.close()
}

main();