import { Injectable } from '@angular/core';
import { Cluster, Graph, Node } from '../types/graph';

@Injectable()
export class GenerateEventsService {

  private heightSchedule = 0;

  private widthSchedule = 0;

  private events = [];

  private originalEvents = [];

  private startDayMilliseconds = 0;

  private endDayMilliseconds = 0;

  constructor() {}

  with( events ) {
    this.originalEvents = JSON.parse( JSON.stringify(events) );
    this.events = events;
    this.transformDateToPixel();
    return this.generateEvents();
  }

  initialize( startDayMilliseconds, endDayMilliseconds, heightSchedule, widthSchedule  ) {
    this.startDayMilliseconds = startDayMilliseconds;
    this.endDayMilliseconds = endDayMilliseconds;
    this.heightSchedule = heightSchedule;
    this.widthSchedule = widthSchedule;
  }

  private generateEvents() {
    const eventsWithPositioning = [];
    const histogram = this.createHistogram();
    const graph = this.createTheGraph( histogram );
    this.setClusterWidth( graph );
    this.setNodesPosition(graph);

    for ( const nodeId in graph.nodes ) {
      if ( graph.nodes.hasOwnProperty(nodeId) ) {
        const node = graph.nodes[nodeId];
        const event = {
          positions: {
            id: node.id,
            top: node.start,
            left: node.position * node.cluster.width,
            height: node.end + 1 - node.start,
            width: node.cluster.width
          },
          data: this.originalEvents.filter(( e ) => parseInt(e.value, 10) === node.id )[0]
        };
        eventsWithPositioning.push(event);
      }
    }
    return eventsWithPositioning;
  }

  private createHistogram() {

    // initializing the minutes array
    const minutes = new Array( this.heightSchedule );
    for (let i = 0; i < minutes.length; i++) {
      minutes[i] = [];
    }

    // setting which events occurs at each minute
    this.events.forEach( (event) => {
      for ( let i = event.date.start; i <= event.date.end - 1; i++ ) {
        minutes[i].push(parseInt((event.value), 10));
      }
    });

    return minutes;
  }

  private createTheGraph( minutes ) {
    const graph = new Graph();
    const nodeMap = {};

    // creating the nodes
    this.events.forEach( (event) => {
      const node = new Node(parseInt(event.value, 10), event.date.start, event.date.end - 1);
      nodeMap[node.id] = node;
    });

    // creating the clusters
    let cluster = null;

    // cluster is a group of nodes which have a connectivity path, when the minute array length is 0 it means that
    // there are n more nodes in the cluster - cluster can be "closed".
    minutes.forEach( (minute, index, arrayMinutes ) => {
      if (minute.length > 0) {

        if ( ( minute[0] !== arrayMinutes[index - 1][0] ) && ( minute.length !== arrayMinutes[index - 1].length )  && cluster) {
          graph.clusters.push(cluster);
          cluster = null;
        }

        cluster = cluster || new Cluster();
        minute.forEach( ( eventId ) => {
          if (!cluster.nodes[eventId]) {
            cluster.nodes[eventId] = nodeMap[eventId];
            nodeMap[eventId].cluster = cluster;
          }
        });
      } else {
        if (cluster !== null) {
          graph.clusters.push(cluster);
        }

        cluster = null;
      }
    });

    if (cluster !== null) {
      graph.clusters.push(cluster);
    }

    // adding neighbours to nodes, neighbours is the group of colliding nodes (events).
    // adding the biggest clique for each site
    minutes.forEach((minute) => {
      minute.forEach( (eventId) => {
        const sourceNode = nodeMap[eventId];

        // a max clique is a biggest group of colliding events
        sourceNode.biggestCliqueSize = Math.max(sourceNode.biggestCliqueSize, minute.length);
        minute.forEach( (targetEventId) => {
          if (eventId !== targetEventId) {
            sourceNode.neighbours[targetEventId] = nodeMap[targetEventId];
          }
        });
      });
    });

    graph.nodes = nodeMap;

    return graph;
  }

  private setClusterWidth( graph ) {
    graph.clusters.forEach( (cluster) => {

      let maxCliqueSize = 1;
      for ( const nodeId in cluster.nodes ) {
        if ( cluster.nodes.hasOwnProperty(nodeId) ) {
          maxCliqueSize = Math.max(maxCliqueSize, cluster.nodes[nodeId].biggestCliqueSize);
        }
      }

      cluster.maxCliqueSize = maxCliqueSize;
      cluster.width = this.widthSchedule / (maxCliqueSize);
    });
  }

  private setNodesPosition( graph ) {
    graph.clusters.forEach( (cluster) => {
      for (const nodeId in cluster.nodes) {
        if ( cluster.nodes.hasOwnProperty(nodeId) ) {
          const node = cluster.nodes[nodeId];
          const positionArray = new Array(node.cluster.maxCliqueSize);

          for (const neighbourId in node.neighbours) {
            if (node.neighbours.hasOwnProperty(neighbourId)) {
              const neighbour = node.neighbours[neighbourId];
              if (neighbour.position != null) {
                positionArray[neighbour.position] = true;
              }
            }
          }

          for (let i = 0; i < positionArray.length; i++) {
            if (!positionArray[i]) {
              node.position = i;
              break;
            }
          }
        }
      }
    });
  }

  private transformDateToPixel() {
    for ( let i = 0; i <= this.events.length - 1; i++) {
       this.events[i].date = Object.assign({}, {
          start: Math.round(this.convertMillisecondsToPixel( this.events[i].date.start )),
          end:  Math.round(this.convertMillisecondsToPixel( this.events[i].date.end ))
       });
    }
  }

  convertMillisecondsToPixel(date = new Date().getTime()) {
    const heightBody = this.heightSchedule;
    const currentDate = date - this.startDayMilliseconds;
    const converted = ( heightBody * currentDate ) / ( this.endDayMilliseconds - this.startDayMilliseconds);

    return converted > heightBody ? -1000 : converted;
  }

}
