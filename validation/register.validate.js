const express = require('express');

const register = async (req, res, next) => {
    const body = req.body;
    const {customer_id, first_name, last_name, age, phone_number, monthly_salary, current_debt} = body;

    if(typeof customer_id !== 'number') {
        return res.status(400).send('customer_id must be a number');
    }
    if(typeof first_name !== 'string' && first_name.length > 50) {
        return res.status(400).send('Invalid first_name');
    }
    if(typeof last_name !== 'string' && last_name.length > 50) {
        return res.status(400).send('Invalid last_name');
    }
    if(typeof age !== 'number') {
        return res.status(400).send('age must be a number');
    }
    if(typeof phone_number !== 'string' && phone_number.length > 15) {
        return res.status(400).send('Invalid phone_number');
    }
    if(typeof monthly_salary !== 'number') {
        return res.status(400).send('monthly_salary must be a number');
    }
    if(typeof current_debt !== 'number') {
        return res.status(400).send('current_debt must be a number');
    }
    next();
}

module.exports = register;