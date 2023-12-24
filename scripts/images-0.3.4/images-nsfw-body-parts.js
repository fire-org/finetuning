require('dotenv').config()

const OpenAI = require('openai');
const Handlebars = require("handlebars");
const fs = require('fs');
const path = require('path');
const generateEntropy = require('../generateEntropy');

const openai = new OpenAI()

const promptTemplate = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'orion-nsfw-body-parts.hbs'), 'utf8'));

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

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)]
}

async function complete({model, topic}) {
  const rows = []

  const promptTemplateData = {
    user_gender: 'male',
    gender: 'female',
    character_name: model['Name'],
    age: model['Age'],
    interests: model['Hobbies'],
    n_messages: nMessages - rows.length,
    pronoun: 'her',
    pronoun_heshe: 'she',
    character_description: `Ethnicity: ${model['Ethnicity']}\nEye Color: ${model['Eye Color']}\nHair Style: ${model['Hair Style']}\nHair Length: ${model['Hair Length']}\nHair Color: ${model['Hair Color']}\nBody Type: ${model['Body Type']}\nBreast Size: ${model['Breast Size']}\nButt Size: ${model['Butt Size']}`,
    topic
  }

  const systemPrompt = promptTemplate(promptTemplateData)

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
        content: `Generate ${nMessages - rows.length} more messages starting with ${rows[rows.length - 1].role == 'USER' ? model['Name'].toUpperCase() : 'USER'}`
      })
    }

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: 'gpt-4-1106-preview',
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

      // Transforms user to USER and assistant to ASSISTANT
      row.role = row.role.toUpperCase()

      // Removes ". ", "...", "!", etc on the beginning of the message
      // Allows [ for [username] and * for things like *moan*
      row.content = row.content.replace(/^[^a-zA-Z\[*]+/, '')

      // Replace these characters
      row.content = row.content.replace(/…+/g, '...')
      row.content = row.content.replace(/’/g, '\'')

      // Trim the message
      row.content = row.content.trim()

      if(
        (row.role != 'USER' && row.role != model['Name'].toUpperCase())
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

      if(!row.content.includes('||')) row.content += ' || none'

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
    conversations: obj.messages.map(a => ({
      from: a.role == 'USER' ? 'human' : 'character',
      value: a.content
    }))
  }
}

async function main() {
  const data = []

  const max = 60
  const step = 10

  for(let i = 0; i < max;) {
    async function newRound() {
      const { model } = generateEntropy()

      const topic = pickRandom([
        'Exhibitionism', 'Masturbation',     'Facial',
        'voyeurism',     'Squirting',        'female dominating male',
        'Edging',        'hand stimulation', 'Handcuffs',
        'Voyeurism',     'anal sex',         'Double penetration',
        'cosplay',       'Toys',             'whipped cream',
        'massage',       'BDSM',             'spanking',
        'Submission',    'Face sitting',     'Outdoor',
        'Roleplay',      'ass licking',      'oral sex',
        'Gangbang',      'doggy-style sex',  'male dominating female',
        'rimming',       'missionary sex',   'Big butt',
        'blowjob',       'anal',             'breasts',
        'Rough sex',     'woman on top sex', 'pussy licking',
        'cow-girl sex',  'dominance',        '69',
        'pegging',       'Threesome',        'outdoor sex',
        'Domination',    'Foot fetish',      'edging',
        'Orgy',          'Deepthroat',       'Creampie',
        'Spanking',      'Public sex',       'sex toys',
        'Lingerie',      'handjob',          'Group sex'
      ])

      const {systemPrompt, conversation} = await complete({model, topic})
      
      data.push({
        type: 'orion-nsfw-images',
        tag: 'orion-nsfw-images',
        user_gender: 'male',
        bot_name: model['Name'],
        bot_age: model['Age'],
        bot_character: {
          "Ethnicity": model['Ethnicity'],
          "Eye Color": model['Eye Color'],
          "Hair Style": model['Hair Style'],
          "Hair Length": model['Hair Length'],
          "Hair Color": model['Hair Color'],
          "Body Type": model['Body Type'],
          "Breast Size": model['Breast Size'],
          "Butt Size": model['Butt Size'],
          "gender": "female",
          "description": `Ethnicity: ${model['Ethnicity']}\nEye Color: ${model['Eye Color']}\nHair Style: ${model['Hair Style']}\nHair Length: ${model['Hair Length']}\nHair Color: ${model['Hair Color']}\nBody Type: ${model['Body Type']}\nBreast Size: ${model['Breast Size']}\nButt Size: ${model['Butt Size']}`,
          "interests": model['Hobbies'],
          "pronoun": "her",
          "pronoun_heshe": "she"
        },
        ...openaiToShareGpt({
          messages: conversation
        })
      })
    }

    const promises = []

    let j
    for(j = i; j < max && j - i < step; j++) {
      promises.push(newRound())
    }
    i = j

    await Promise.all(promises)

    fs.writeFileSync(
      path.join(__dirname, 'nsfw-images-body-parts.json'),
      JSON.stringify(data, null, 2)
    )
  }
}

main();