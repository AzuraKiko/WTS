// import dayjs from 'dayjs';

// const toDate = dayjs()
//     .subtract(1, 'day')
//     .format('YYYYMMDD');

// const frDate = dayjs()
//     .subtract(1, 'month')
//     .format('YYYYMMDD');

// const result = {
//     frDate,
//     toDate
// };

// console.log(result);
const moment = require('moment');

const toDate = moment().subtract(1, 'day').format('YYYYMMDD');
const frDate = moment().subtract(3, 'month').format('YYYYMMDD');

console.log({ frDate, toDate });


