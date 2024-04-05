const client = require("../database");

const checkEligibilityValidation = async (req, res, next) => {
    try {
        const { customer_id, loanAmount, interest, tenure} = req.body;

        if(!customer_id || !loanAmount || !interest || !tenure) {
            return res.status(400).send("Please provide all the required fields");
        }

        const query = `SELECT COUNT(*) FROM customer WHERE customer_id = ${customer_id};`;
        
        const data = await client.query(query);
        if(data?.rows[0]?.count != 1) {
            return res.status(400).send("Invalid customer id");
        }
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).send("An error occurred");
    }
}

module.exports = checkEligibilityValidation;