import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Client } from 'pg';
import { Observable } from 'rxjs';
import { PubSubService } from '../pubSub.service';
import { pgPubSubProvider } from './postgresPubSub.provider';

@Injectable()
export class PgPubSubService<T = any> implements PubSubService<T> {
  logger = new Logger('PubSubService');
  constructor(@Inject(pgPubSubProvider.provide) private readonly pgPublish: Client) { }

  private listenerMap?: Map<string, ((arg: any) => any)[]>;

  private normalizeChannel (channelName: string) {
    return channelName.toLowerCase();
  }

  private async unregisterListener (channel: string, handler: (arg: any) => any) {
    const normalChannel = this.normalizeChannel(channel);
    let existingListeners = this.listenerMap?.get(normalChannel);
    if (!existingListeners || !this.listenerMap) return;

    existingListeners = existingListeners.filter(listener => listener !== handler);
    this.listenerMap.set(normalChannel, existingListeners);

    this.pgPublish.query(`UNLISTEN ${normalChannel}`);
  }

  private async registerListener (channel: string, handler: (arg: any) => any) {
    const normalChannel = this.normalizeChannel(channel);

    let listenerMap = this.listenerMap;
    if (!listenerMap) {
      listenerMap = this.initNotifyListener();
    }

    const existingListeners = listenerMap.get(normalChannel) ?? [];
    existingListeners.push(handler);
    listenerMap.set(normalChannel, existingListeners);

    this.logger.log('listening to ' + normalChannel);

    await this.pgPublish.query(`LISTEN ${normalChannel}`);
  }

  private initNotifyListener () {
    this.listenerMap = new Map();

    this.pgPublish.on('notification', (message) => {
      const normalChannel = this.normalizeChannel(message.channel);
      this.listenerMap?.get(normalChannel)?.forEach(handler => handler(message.payload));
    });

    return this.listenerMap;
  }

  publish<K extends keyof T & string> (channel: K, message: T[K]): Promise<unknown>;
  async publish (channel: string, message: any): Promise<unknown> {
    const normalChannel = this.normalizeChannel(channel);

    const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');

    return this.pgPublish.query(`NOTIFY ${normalChannel}, '${encodedMessage}'`);
  }

  subscribe<K extends keyof T & string> (channel: K): Observable<T[K]>;
  subscribe (channel: string): Observable<unknown> {
    const normalChannel = this.normalizeChannel(channel);

    return new Observable((subscriber) => {
      const handler = (payload: any) => {
        let parsed: any;
        
        try {
          const decoded = Buffer.from(payload, 'base64').toString('utf-8');
          this.logger.log(`Received message on ${channel}: ${decoded}`)
          parsed = JSON.parse(decoded);
        } catch (e) {
          parsed = payload;
        }

        subscriber.next(parsed);
      };

      this.registerListener(normalChannel, handler);

      return () => {
        this.unregisterListener(normalChannel, handler);
      };
    });
  }
}
