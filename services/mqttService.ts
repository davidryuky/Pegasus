import mqtt from 'mqtt';

// Using EMQX public broker over WebSocket (Secure)
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

export class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private topic: string = '';

  connect(sessionId: string, onMessage: (message: any) => void, onConnect: () => void) {
    // Unique client ID to prevent conflicts
    const clientId = `pegasus_client_${Math.random().toString(16).substring(2, 8)}`;
    
    this.topic = `pegasus/roadsec/${sessionId}`;

    this.client = mqtt.connect(BROKER_URL, {
      clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      protocolVersion: 5
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT Broker');
      if (this.client) {
        this.client.subscribe(this.topic, (err) => {
          if (!err) {
            console.log(`Subscribed to ${this.topic}`);
            onConnect();
          }
        });
      }
    });

    this.client.on('message', (_topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        onMessage(payload);
      } catch (e) {
        console.error('Failed to parse MQTT message', e);
      }
    });

    this.client.on('error', (err) => {
      console.error('MQTT Error:', err);
    });
  }

  publish(sessionId: string, data: any) {
    if (!this.client || !this.client.connected) {
      // If not connected (e.g., mobile sender just opened), connect temporarily
       const clientId = `pegasus_sender_${Math.random().toString(16).substring(2, 8)}`;
       const tempClient = mqtt.connect(BROKER_URL, { clientId });
       
       tempClient.on('connect', () => {
         const topic = `pegasus/roadsec/${sessionId}`;
         tempClient.publish(topic, JSON.stringify(data), { qos: 0, retain: false }, () => {
           tempClient.end();
         });
       });
    } else {
      this.client.publish(this.topic, JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

export const mqttService = new MQTTService();