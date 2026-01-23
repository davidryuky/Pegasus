
import mqtt from 'mqtt';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

export class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private baseTopic: string = '';
  private isConnecting: boolean = false;

  connect(
    sessionId: string, 
    onData: (data: any) => void, 
    onConnect: () => void,
    onCommand?: (cmd: any) => void,
    onStream?: (stream: any) => void
  ) {
    if (this.client?.connected || this.isConnecting) return;
    
    this.isConnecting = true;
    const clientId = `pegasus_${Math.random().toString(16).substring(2, 8)}`;
    this.baseTopic = `pegasus/roadsec/${sessionId}`;

    this.client = mqtt.connect(BROKER_URL, {
      clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 30 * 1000,
    });

    this.client.on('connect', () => {
      this.isConnecting = false;
      console.log('PEGASUS C2: Uplink established');
      if (this.client) {
        this.client.subscribe(`${this.baseTopic}/data`);
        if (onCommand) this.client.subscribe(`${this.baseTopic}/cmd`);
        if (onStream) this.client.subscribe(`${this.baseTopic}/stream`);
        onConnect();
      }
    });

    this.client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (topic.endsWith('/data')) onData(payload);
        else if (topic.endsWith('/cmd') && onCommand) onCommand(payload);
        else if (topic.endsWith('/stream') && onStream) onStream(payload);
      } catch (e) {
        console.error('MQTT Parse Error', e);
      }
    });

    this.client.on('close', () => {
      this.isConnecting = false;
    });
  }

  publishData(sessionId: string, data: any) {
    this.publish(`${sessionId}/data`, data);
  }

  publishCommand(sessionId: string, command: any) {
    this.publish(`${sessionId}/cmd`, command);
  }

  publishStream(sessionId: string, streamData: any) {
    this.publish(`${sessionId}/stream`, streamData, 0); // QOS 0 for video frames
  }

  private publish(topicSuffix: string, data: any, qos: 0 | 1 = 1) {
    const fullTopic = `pegasus/roadsec/${topicSuffix}`;
    if (this.client?.connected) {
      this.client.publish(fullTopic, JSON.stringify(data), { qos });
    } else {
      console.warn('MQTT client not connected, message dropped');
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const mqttService = new MQTTService();
