const databaseUrl = process.env.DATABASE_URL;

const { Client } = require("pg");
const xlsx = require('xlsx');

const client = new Client({
  connectionString: databaseUrl,
});

setTimeout(async () => {
  try {
    await client.connect();

    const customerCreate = `
            CREATE TABLE IF NOT EXISTS customer (
                customer_id INT PRIMARY KEY,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                age INT NOT NULL,
                phone_number VARCHAR(15) NOT NULL,
                monthly_salary INT NOT NULL,
                approved_limit INT NOT NULL,
                current_debt INT NOT NULL
            )
        `;
    await client.query(customerCreate);

    const loanCreate = `
                CREATE TABLE IF NOT EXISTS loan (
                        loan_id INT PRIMARY KEY,
                        customer_id INT NOT NULL,
                        amount INT NOT NULL,
                        tenure INT NOT NULL,
                        interest_rate DECIMAL NOT NULL,
                        monthly_repayment INT NOT NULL,
                        emi INT NOT NULL,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
                )
        `;
    await client.query(loanCreate);
    
    const customerPath = './excelFiles/customer_data.xlsx';
    const customerData = readExcelFile(customerPath);
    await insertCustomer(customerData);

    const loanPath = './excelFiles/loan_data.xlsx';
    const loanData = readExcelFile(loanPath);
    await insertLoan(loanData);
  } catch (error) {
    console.error("Error executing database queries:", error);
  }
}, 5000);

function readExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
}

async function insertCustomer(data) {
  try {
    for (const row of data) {
      const query = `INSERT INTO customer (customer_id, first_name, last_name, age, phone_number, monthly_salary, approved_limit, current_debt) VALUES(${row['Customer ID']}, '${row['First Name']}', '${row['Last Name']}', ${row.Age}, '${row['Phone Number']}', ${row['Monthly Salary']}, ${row['Monthly Salary']*36}, ${row['Current Debt']}) ON CONFLICT DO NOTHING;`
      client.query(query);
    }
    console.log('Data inserted successfully');
  } catch (error) {
    console.error('Error inserting data:', error);
  }
}

async function insertLoan(data) {
  try {
    for (const row of data) {
      const startDate = new Date(row['Date of Approval']).toISOString().slice(0, 19).replace('T', ' ');
      const endDate = new Date(row['End Date']).toISOString().slice(0, 19).replace('T', ' ');
      const query = `INSERT INTO loan (customer_id, loan_id, amount, tenure, interest_rate, monthly_repayment, emi, start_date, end_date) VALUES(${row['Customer ID']}, '${row['Loan ID']}', '${row['Loan Amount']}', ${row['Tenure']}, '${row['Interest Rate']}', ${row['Monthly payment']}, ${row['EMIs paid on Time']}, '${startDate}', '${endDate}') ON CONFLICT DO NOTHING;`
      client.query(query, (err, result) => {
        
      });
    }
    console.log('Data inserted successfully');
  } catch (error) {
    console.error('Error inserting data:', error);
  }
}

module.exports = client;
