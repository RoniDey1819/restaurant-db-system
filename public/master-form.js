document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('masterForm');
    const itemsList = document.getElementById('itemsList');
    
    // Load existing items on page load
    loadCatalogueItems();
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const itemData = {
            name: formData.get('itemName'),
            description: formData.get('itemDescription'),
            price: parseFloat(formData.get('price')),
            is_vegetarian: formData.get('isVegetarian') === 'on'
        };
        
        // Validate required fields
        if (!itemData.name || !itemData.price) {
            showAlert('Please fill in all required fields', 'error');
            return;
        }
        
        if (itemData.price <= 0) {
            showAlert('Price must be greater than 0', 'error');
            return;
        }
        
        // Submit data to server
        fetch('/api/catalogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Item added successfully!', 'success');
                
                // Check if user wants to add another item
                const addAnother = formData.get('addAnother');
                if (addAnother === 'yes') {
                    // Clear form but keep the "add another" selection
                    form.reset();
                    document.querySelector('input[name="addAnother"][value="yes"]').checked = true;
                } else {
                    // Clear form completely
                    form.reset();
                }
                
                // Reload items list
                loadCatalogueItems();
            } else {
                showAlert(data.error || 'Error adding item', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error adding item. Please try again.', 'error');
        });
    });
    
    // Load catalogue items from server
    function loadCatalogueItems() {
        fetch('/api/catalogue')
        .then(response => response.json())
        .then(data => {
            displayItems(data);
        })
        .catch(error => {
            console.error('Error loading items:', error);
            itemsList.innerHTML = '<p class="alert alert-error">Error loading items</p>';
        });
    }
    
    // Display items in the list
    function displayItems(items) {
        if (items.length === 0) {
            itemsList.innerHTML = '<p class="loading">No items found</p>';
            return;
        }
        
        itemsList.innerHTML = items.map(item => `
            <div class="item-card">
                <h4>${item.Name}</h4>
                <p><strong>ID:</strong> ${item.Item_ID}</p>
                <p><strong>Description:</strong> ${item.Description || 'No description'}</p>
                <p class="price"><strong>Price:</strong> ₹${item.price}</p>
                <p><strong>Type:</strong> ${item.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}</p>
                <p><strong>Status:</strong> ${item.is_active ? 'Active' : 'Inactive'}</p>
            </div>
        `).join('');
    }
    
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
    
    // Price input validation
    document.getElementById('price').addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        if (value < 0) {
            e.target.value = '';
        }
    });
    
    // Auto-focus on item name field
    document.getElementById('itemName').focus();
});