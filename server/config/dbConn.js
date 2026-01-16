import mongoose from 'mongoose'

export const connectDB = async ()=>{
    try{
        const conn = await mongoose.connect(process.env.DATABASE_URI)
        console.log(`MongoDB connected ${conn.connection.host}`)
    }
    catch(err){
        console.log("mongodb connnection error"+err)
    }
}

// import {Sequelize} from 'sequelize'
// import dotenv from 'dotenv'

// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,{
//     host:process.env.DB_HOST,
//     dialect:'mysql',
//     port: process.env.DB_PORT,
//     logging:false
// })

// sequelize.authenticate()
// .then(()=> console.log("mysql connected successfully!"))
// .catch(()=> console.log("something went wrong connection error"))

// export default sequelize