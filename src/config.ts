import dotenv from "dotenv"
import Joi from "joi"

dotenv.config()

type Config = {
  apiMaticSite: string
}

const envVarsSchema = Joi.object({
  APIMATIC_SITE: Joi.string().required().description("Apimatic site")
})
  .unknown()
  .required()

const { error, value: envVars } = envVarsSchema.validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

const config: Config = {
  apiMaticSite: envVars.APIMATIC_SITE
}

export default config
