document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loadPincodeReport').addEventListener('click', fetchOrdersByPincode);
    document.getElementById('dateRangeForm').addEventListener('submit', fetchOrdersByDateRange);
});

function fetchOrdersByPincode() {
    fetch('/api/reports/orders-by-pincode')
        .then(res => res.json())
        .then(data => {
            const zipCodes = Object.keys(data);
            const orderCounts = zipCodes.map(zip => data[zip].length);

            renderChart(zipCodes, orderCounts);
            renderPincodeDetails(data);
        })
        .catch(err => console.error(err));
}

function renderChart(labels, values) {
    const chart = document.getElementById('chart');
    chart.innerHTML = '';

    const max = Math.max(...values, 1);

    labels.forEach((zip, i) => {
        const count = values[i];
        const pct = (count / max) * 100;

        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';
        barContainer.innerHTML = `
          <div class="bar-label">${zip} (${count})</div>
          <div class="bar" style="width:${pct}%"><span>${count}</span></div>
        `;
        chart.appendChild(barContainer);
    });
}

function renderPincodeDetails(data) {
    const c = document.getElementById('pincodeOrders');
    c.innerHTML = '';

    for (const zip in data) {
        const orders = data[zip];
        let html = `<h4>Pincode: ${zip} — ${orders.length} order(s)</h4>`;
        orders.forEach(o => {
            html += `
              <div class="item-card">
                <p><strong>Order ID:</strong> ${o.Order_ID}</p>
                <p><strong>Date:</strong> ${new Date(o.order_datetime).toLocaleString()}</p>
                <p><strong>Total:</strong> ₹${o.total_amount}</p>
                <p><strong>Final:</strong> ₹${o.final_amount}</p>
              </div>`;
        });
        c.innerHTML += html;
    }
}

function fetchOrdersByDateRange(e) {
    e.preventDefault();
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) return alert('Select both dates');

    fetch('/api/reports/orders-by-date', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ startDate: start, endDate: end })
    })
    .then(res => res.json())
    .then(orders => {
        const c = document.getElementById('dateRangeOrders');
        c.innerHTML = '';
        if (!orders.length) return c.innerHTML = '<p class="loading">No orders for this date range.</p>';
        let html = '';
        orders.forEach(o => {
            html += `
              <div class="item-card">
                <p><strong>Order ID:</strong> ${o.Order_ID}</p>
                <p><strong>Customer:</strong> ${o.first_name} ${o.last_name}</p>
                <p><strong>Pincode:</strong> ${o.zip_code || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(o.order_datetime).toLocaleString()}</p>
                <p><strong>Total:</strong> ₹${o.total_amount}</p>
                <p><strong>Final:</strong> ₹${o.final_amount}</p>
              </div>`;
        });
        c.innerHTML = html;
    })
    .catch(err => {
        console.error(err);
        alert('Error loading date-range report.');
    });
}
