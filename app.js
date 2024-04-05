const express = require("express");
const app = express();
const client = require("./database");
const cors = require("cors");
const registerValidation = require("./validation/register.validate");
const checkEligibilityValidation = require("./validation/check-eligibility.validate");

app.use(cors());
app.use(express.json());



app.post("/register", registerValidation, (req, res) => {
    try {
        const { customer_id, first_name, last_name, age, phone_number, monthly_salary, current_debt } = req.body;
        const query = `INSERT INTO customer (customer_id, first_name, last_name, age, phone_number, monthly_salary, approved_limit, current_debt) VALUES (${customer_id}, '${first_name}', '${last_name}', ${age},'${phone_number}', ${monthly_salary}, ${36*monthly_salary}, ${current_debt}) RETURNING *`;
        
        client.query(query, (err, result) => {
            if (err) {
                console.error("Error inserting row:", err);
                res.status(500).send("Error inserting row");
            } else {
                res.json({result: result.rows[0]});
            }
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error");
    }
});


app.post("/check-eligibility", checkEligibilityValidation, async (req, res) => {
    try {
        const { customer_id, loanAmount, interest, tenure } = req.body;
        
        const query = `SELECT * FROM loan WHERE customer_id = ${customer_id}`;
        const data = await client.query(query);

        let totalLoan = 0, loansPaid = 0, loansCurrentYear, loansVolume = 0, totalpayment = 0;
        for(let i = 0; i < data.rows.length; i++) {
            totalLoan += 1;
            totalpayment += data.rows[i].monthly_repayment;
            if(data.rows[i].end_date < new Date()) {
                loansPaid += 1;
            }
            if(data.rows[i].start_date.getFullYear() == new Date().getFullYear()) {
                loansCurrentYear += 1;
            }
            loansVolume += data.rows[i].amount;
        }

        const customerQuery = `SELECT * FROM customer WHERE customer_id = ${customer_id}`;
        const customerData = await client.query(customerQuery);
        const approvedLimit = customerData.rows[0].approved_limit;
        if(approvedLimit < loansVolume) {
            return res.json({customer_id, loanAmount, interest, tenure, approved: false});
        }

        if(totalLoan === 0) {
            return res.json({customer_id, loanAmount, interest, tenure, approved: true, monthly_installment: installment(loanAmount, interest, tenure)});
        }
        const creditScore = (loansPaid / totalLoan) * 100;

        if (loansCurrentYear > 3) {
            creditScore -= 10;
        }

        let approved = false, approvedInterest = 0;
        if(creditScore > 50) {
            approved = true;
            approvedInterest = interest;
        }
        else if(creditScore > 30) {
            approved = true;
            approvedInterest = 12;
        }
        else if(creditScore > 10) {
            approved = true;
            approvedInterest = 16;
        }
        else {
            return res.json({customer_id, loanAmount, interest, tenure, approved: false});
        }
        if(customerData.rows[0].monthly_salary/2 < totalpayment) {
            return res.json({customer_id, loanAmount, interest, tenure, approved: false});
        }
        return res.json({customer_id, loanAmount, interest, tenure, approved: true, monthly_installment: installment(loanAmount, approvedInterest, tenure)});
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send("Error");
    }
});

const installment = (principal, rate, time) => {
    return (principal * rate * Math.pow(1 + rate, time)) / (Math.pow(1 + rate, time) - 1);
}

app.post("/create-loan", checkEligibilityValidation, async (req, res) => {
    try {
        const { customer_id, loanAmount, interest, tenure } = req.body;
        
        const query = `SELECT * FROM loan WHERE customer_id = ${customer_id}`;
        const data = await client.query(query);

        let totalLoan = 0, loansPaid = 0, loansCurrentYear, loansVolume = 0, totalpayment = 0;
        for(let i = 0; i < data.rows.length; i++) {
            totalLoan += 1;
            totalpayment += data.rows[i].monthly_repayment;
            if(data.rows[i].end_date < new Date()) {
                loansPaid += 1;
            }
            if(data.rows[i].start_date.getFullYear() == new Date().getFullYear()) {
                loansCurrentYear += 1;
            }
            loansVolume += data.rows[i].amount;
        }

        const customerQuery = `SELECT * FROM customer WHERE customer_id = ${customer_id}`;
        const customerData = await client.query(customerQuery);
        const approvedLimit = customerData.rows[0].approved_limit;
        if(approvedLimit < loansVolume) {
            return res.json({customer_id, loanAmount, interest, tenure, approved: false, message: "Loan amount exceeds approved limit"});
        }

        if(totalLoan === 0) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + tenure);
            const loanQuery = `INSERT INTO loan (customer_id, loan_id, amount, tenure, interest_rate, monthly_repayment, emi, start_date, end_date) VALUES (${customer_id}, ${Math.floor(Math.random()*10000)},${loanAmount}, ${tenure}, ${interest}, ${installment(loanAmount, interest, tenure)}, ${tenure}, '${new Date().toISOString()}', '${endDate.toISOString()}') RETURNING *`;
            const loanData = await client.query(loanQuery);
            return res.json({...loanData.rows[0], message: "Loan created successfully"});
        }
        const creditScore = (loansPaid / totalLoan) * 100;

        if (loansCurrentYear > 3) {
            creditScore -= 10;
        }

        let approved = false, approvedInterest = 0;
        if(creditScore > 50) {
            approved = true;
            approvedInterest = interest;
        }
        else if(creditScore > 30) {
            approved = true;
            approvedInterest = 12;
        }
        else if(creditScore > 10) {
            approved = true;
            approvedInterest = 16;
        }
        else {
            return res.json({customer_id, loanAmount, interest, tenure, approved: false, message: "Credit score too low"});
        }
        if(customerData.rows[0].monthly_salary/2 < totalpayment) {
            return res.json({customer_id, loanAmount, interest, tenure, approved: false, message: "Monthly salary too low"});
        }
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + tenure);
        const loanQuery = `INSERT INTO loan (customer_id, loan_id, amount, tenure, interest_rate, monthly_repayment, emi, start_date, end_date) VALUES (${customer_id}, ${Math.floor(Math.random()*10000)},${loanAmount}, ${tenure}, ${approvedInterest}, ${installment(loanAmount, approvedInterest, tenure)}, ${tenure}, '${new Date().toISOString()}', '${endDate.toISOString()}') RETURNING *`;
        const loanData = await client.query(loanQuery);
        return res.json({...loanData.rows[0], message: "Loan created successfully"});
    } catch (error) {
        console.error("Error creating loan:", error);
        return res.status(500).send("Error creating loan");
    }
});

app.get('/view-loan/:loan_id', async (req, res) => {
    try {
        const { loan_id } = req.params;
        const query = `SELECT loan.*, customer.* FROM loan INNER JOIN customer ON loan.customer_id = customer.customer_id WHERE loan.loan_id = ${loan_id}`;
        const data = await client.query(query);
        if(data.rows.length === 0) {
            return res.status(404).send("Loan not found");
        }
        return res.json(data.rows[0]);
    } catch (error) {
        console.error("Error retrieving loan:", error);
        return res.status(500).send("Error retrieving loan");
    }
});

app.post('/make-payment/:customer_id/:loan_id', async (req, res) => {
    try {
        const { customer_id, loan_id } = req.params;
        const amount = req.body.amount;
        const query = `SELECT * FROM loan WHERE customer_id = ${customer_id} AND loan_id = ${loan_id}`;
        const data = await client.query(query);
        if(data.rows.length === 0) {
            return res.status(404).send("Loan not found");
        }
        const loan = data.rows[0];
        const emi = loan.emi - 1;
        const monthlyRepayment = adjustInstallment(loan.amount, loan.interest_rate, loan.tenure, emi, amount);
        const query2 = `UPDATE loan SET emi = ${emi}, monthly_repayment = ${monthlyRepayment} WHERE customer_id = ${customer_id} AND loan_id = ${loan_id} RETURNING *`;
        const data2 = await client.query(query2);
        return res.json(data2.rows[0]);
    } catch (error) {
        console.error("Error making payment:", error);
        return res.status(500).send("Error making payment");
    }
});

app.get('/view-statement/:customer_id/:loan_id', async (req, res) => {
    try {
        const { customer_id, loan_id } = req.params;
        const query = `SELECT * FROM loan WHERE customer_id = ${customer_id} AND loan_id = ${loan_id}`;
        const data = await client.query(query);
        if(data.rows.length === 0) {
            return res.status(404).send("Loan not found");
        }
        const result = {customer_id: data.rows[0].customer_id, loan_id: data.rows[0].loan_id, principal: data.rows[0].amount, interest_rate: data.rows[0].interest_rate, monthly_installment: data.rows[0].monthly_repayment, repayments_left: data.rows[0].emi, amount_paid: (data.rows[0].tenure - data.rows[0].emi) * data.rows[0].monthly_repayment};
        return res.json(result);
    } catch (error) {
        console.error("Error viewing statement:", error);
        return res.status(500).send("Error viewing statement");
    }
});

const adjustInstallment = (loanAmount, interest, tenure, emi, payment) => {
    const amountPaid = (emi - 1) * tenure + payment;
    return installment(loanAmount - amountPaid, interest, tenure - emi + 1);
}


app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
