
const parser = new RegexIntentParser();

const result =  parser.parse(
    "Need eco friendly crackers for kids under 3000"
);

console.log(JSON.stringify(result, null, 2));