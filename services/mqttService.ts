import mqtt from 'mqtt';

// Using EMQX public broker over WebSocket (Secure)
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

export class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private baseTopic: string = '';

  connect(
    sessionId: string, 
    onData: (data: any) => void, 
    onConnect: () => void,
    onCommand?: (cmd: any) => void,
    onStream?: (stream: any) => void
  ) {
    // Unique client ID to prevent conflicts
    const clientId = `pegasus_client_${Math.random().toString(16).substring(2, 8)}`;
    
    this.baseTopic = `pegasus/roadsec/${sessionId}`;

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
        // Subscribe to main data channel
        this.client.subscribe(`${this.baseTopic}/data`);
        
        // If handler provided, subscribe to command channel
        if (onCommand) {
          this.client.subscribe(`${this.baseTopic}/cmd`);
        }

        // If handler provided, subscribe to stream channel
        if (onStream) {
          this.client.subscribe(`${this.baseTopic}/stream`);
        }

        onConnect();
      }
    });

    this.client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        
        if (topic.endsWith('/data')) {
          onData(payload);
        } else if (topic.endsWith('/cmd') && onCommand) {
          onCommand(payload);
        } else if (topic.endsWith('/stream') && onStream) {
          onStream(payload);
        }
      } catch (e) {
        console.error('Failed to parse MQTT message', e);
      }
    });

    this.client.on('error', (err) => {
      console.error('MQTT Error:', err);
    });
  }

  // Publish telemetry data
  publishData(sessionId: string, data: any) {
    this.publish(`${sessionId}/data`, data);
  }

  // Publish command (Dashboard -> Mobile)
  publishCommand(sessionId: string, command: any) {
    this.publish(`${sessionId}/cmd`, command);
  }

  // Publish video frame (Mobile -> Dashboard)
  publishStream(sessionId: string, streamData: any) {
    this.publish(`${sessionId}/stream`, streamData);
  }

  private publish(topicSuffix: string, data: any) {
    const fullTopic = `pegasus/roadsec/${topicSuffix}`;
    
    if (!this.client || !this.client.connected) {
       const clientId = `pegasus_sender_${Math.random().toString(16).substring(2, 8)}`;
       const tempClient = mqtt.connect(BROKER_URL, { clientId });
       
       tempClient.on('connect', () => {
         tempClient.publish(fullTopic, JSON.stringify(data), { qos: 0, retain: false }, () => {
           tempClient.end();
         });
       });
    } else {
      this.client.publish(fullTopic, JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

export const mqttService = new MQTTService();
