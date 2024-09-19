import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

// Define the schema for Wardrobe and Clothing models
const data_model = a.schema({
  Wardrobe: a
    .model({
      content: a.string().required(),
      clothes: a.hasMany('Clothing', "wardrobeID") 
    })
    .authorization(allow => [allow.owner()]),
    
  Clothing: a
    .model({
      brand: a.string(),
      material: a.string(),
      size: a.string(),
      yearBought: a.string(),
      clothingType: a.string(),
      wardrobeID: a.id(),
      wardrobe: a.belongsTo('Wardrobe', "wardrobeID") // Many-to-one relationship
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof data_model>;

export const data = defineData({
  schema: data_model,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'
  }
});
