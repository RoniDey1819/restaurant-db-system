document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('orderForm');
    const orderItemsContainer = document.getElementById('orderItems');
    const addItemBtn = document.getElementById('addItemBtn');
    const totalAmountField = document.getElementById('totalAmount');
    
    let itemCounter = 1;
    let catalogueItems = [];
    let deliveryStaff = [];
    
    // Set current date
    document.getElementById('orderDate').valueAsDate = new Date();
    
    // Load catalogue items and delivery staff
    loadCatalogueItems();
    loadDeliveryStaff();
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const orderData = {
            customer_name: formData.get('customerName'),
            customer_phone: formData.get('customerPhone'),
            customer_email: formData.get('customerEmail'),
            customer_address: formData.get('customerAddress'),
            pincode: formData.get('pincode'),
            delivery_staff_id: formData.get('deliveryPerson') || null,
            items: []
        };
        
        // Collect all items
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach((row, index) => {
            const itemSelect = row.querySelector(`select[name="itemName${index + 1}"]`);
            const quantityInput = row.querySelector(`input[name="quantity${index + 1}"]`);
            const priceInput = row.querySelector(`input[name="price${index + 1}"]`);
            
            if (itemSelect && itemSelect.value && quantityInput && quantityInput.value) {
                orderData.items.push({
                    item_id: parseInt(itemSelect.value),
                    quantity: parseInt(quantityInput.value),
                    price: parseFloat(priceInput.value)
                });
            }
        });
        
        // Validate required fields
        if (!orderData.customer_name || !orderData.customer_address) {
            showAlert('Please fill in customer name and address', 'error');
            return;
        }
        
        if (orderData.items.length === 0) {
            showAlert('Please add at least one item to the order', 'error');
            return;
        }
        
        // Submit order
        fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(`Order created successfully! Order ID: ${data.order_id}`, 'success');
                form.reset();
                
                // Reset items container
                orderItemsContainer.innerHTML = getItemRowHTML(1);
                itemCounter = 1;
                setupItemRowListeners();
                
                // Reset date
                document.getElementById('orderDate').valueAsDate = new Date();
                
                // Update total
                updateTotal();
            } else {
                showAlert(data.error || 'Error creating order', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error creating order. Please try again.', 'error');
        });
    });
    
    // Add item button handler
    addItemBtn.addEventListener('click', function() {
        itemCounter++;
        const newItemRow = document.createElement('div');
        newItemRow.className = 'item-row';
        newItemRow.innerHTML = getItemRowHTML(itemCounter);
        orderItemsContainer.appendChild(newItemRow);
        setupItemRowListeners();
        populateItemSelect(newItemRow.querySelector('select'));
    });
    
    // Radio button handler for add another item
    document.querySelectorAll('input[name="addAnotherItem"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                addItemBtn.style.display = 'inline-block';
            } else {
                addItemBtn.style.display = 'none';
            }
        });
    });
    
    // Load catalogue items
    function loadCatalogueItems() {
        fetch('/api/catalogue')
        .then(response => response.json())
        .then(data => {
            catalogueItems = data;
            populateAllItemSelects();
        })
        .catch(error => {
            console.error('Error loading catalogue items:', error);
        });
    }
    
    // Load delivery staff
    function loadDeliveryStaff() {
        fetch('/api/delivery-staff')
        .then(response => response.json())
        .then(data => {
            deliveryStaff = data;
            populateDeliveryStaffSelect();
        })
        .catch(error => {
            console.error('Error loading delivery staff:', error);
        });
    }
    
    // Populate delivery staff select
    function populateDeliveryStaffSelect() {
        const deliverySelect = document.getElementById('deliveryPerson');
        deliverySelect.innerHTML = '<option value="">Select Delivery Person</option>';
        
        deliveryStaff.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.staff_id;
            option.textContent = `${staff.name} (${staff.vehicle_type})`;
            deliverySelect.appendChild(option);
        });
    }
    
    // Populate all item selects
    function populateAllItemSelects() {
        const itemSelects = document.querySelectorAll('select[name^="itemName"]');
        itemSelects.forEach(select => {
            populateItemSelect(select);
        });
    }
    
    // Populate individual item select
    function populateItemSelect(select) {
        select.innerHTML = '<option value="">Select Item</option>';
        
        catalogueItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.Item_ID;
            option.textContent = `${item.Name} - ₹${item.price}`;
            option.dataset.price = item.price;
            select.appendChild(option);
        });
    }
    
    // Get item row HTML
    function getItemRowHTML(index) {
        return `
            <div class="form-group">
                <label for="itemName${index}">Item Name *</label>
                <select id="itemName${index}" name="itemName${index}" required>
                    <option value="">Select Item</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="quantity${index}">Quantity *</label>
                <input type="number" id="quantity${index}" name="quantity${index}" min="1" value="1" required>
            </div>
            
            <div class="form-group">
                <label for="price${index}">Price (Rs.)</label>
                <input type="number" id="price${index}" name="price${index}" step="0.01" readonly>
            </div>
            
            <div class="form-group">
                <label for="subtotal${index}">Subtotal (Rs.)</label>
                <input type="number" id="subtotal${index}" name="subtotal${index}" step="0.01" readonly>
                ${index > 1 ? '<button type="button" class="remove-item" onclick="removeItem(this)">Remove</button>' : ''}
            </div>
        `;
    }
    
    // Setup event listeners for item rows
    function setupItemRowListeners() {
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach((row, index) => {
            const itemSelect = row.querySelector(`select[name="itemName${index + 1}"]`);
            const quantityInput = row.querySelector(`input[name="quantity${index + 1}"]`);
            const priceInput = row.querySelector(`input[name="price${index + 1}"]`);
            const subtotalInput = row.querySelector(`input[name="subtotal${index + 1}"]`);
            
            if (itemSelect) {
                itemSelect.addEventListener('change', function() {
                    const selectedOption = this.options[this.selectedIndex];
                    const price = selectedOption.dataset.price || 0;
                    priceInput.value = price;
                    updateSubtotal(quantityInput, priceInput, subtotalInput);
                });
            }
            
            if (quantityInput) {
                quantityInput.addEventListener('input', function() {
                    updateSubtotal(quantityInput, priceInput, subtotalInput);
                });
            }
        });
    }
    
    // Update subtotal for an item
    function updateSubtotal(quantityInput, priceInput, subtotalInput) {
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const subtotal = quantity * price;
        subtotalInput.value = subtotal.toFixed(2);
        updateTotal();
    }
    
    // Update total amount
    function updateTotal() {
        let total = 0;
        const subtotalInputs = document.querySelectorAll('input[name^="subtotal"]');
        subtotalInputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        totalAmountField.value = total.toFixed(2);
    }
    
    // Remove item row
    window.removeItem = function(button) {
        const itemRow = button.closest('.item-row');
        itemRow.remove();
        updateTotal();
    };
    
    // Show alert messages
    function showAlert(message, type) {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        form.insertBefore(alert, form.firstChild);
        
        // Auto-hide alert after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
    
    // Initial setup
    setupItemRowListeners();
    
    // Auto-focus on customer name field
    document.getElementById('customerName').focus();
});