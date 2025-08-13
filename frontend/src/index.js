const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

// Function to fetch and display messages from backend
async function fetchMessages() {
  try {
    const res = await fetch('http://localhost:3000/messages');
    const messages = await res.json();

    chatMessages.innerHTML = ''; // clear existing messages

    messages.forEach(msg => {
      const div = document.createElement('div');
      div.classList.add('message');
      // If sender is 'You' use sent style, else received
      div.classList.add(msg.sender === 'You' ? 'sent' : 'received');
      div.textContent = msg.text;
      chatMessages.appendChild(div);
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
}

// Initial fetch of messages when page loads
fetchMessages();

// Handle new message submission
chatForm.addEventListener('submit', async e => {
  e.preventDefault();

  const messageText = messageInput.value.trim();
  if (!messageText) return;

  // Build message object with unique id
  const newMessage = {
    id: 'msg_' + Date.now(),
    conversationId: 'conversation_1',
    sender: 'You',
    text: messageText,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch('http://localhost:3000/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMessage),
    });

    if (res.ok) {
      messageInput.value = '';  // clear input box
      fetchMessages();          // reload messages to show the new one
    } else {
      const errorData = await res.json();
      alert('Error: ' + errorData.error);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
});
